import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

const COMPANY_ID = "c1fd70c2-bb2e-46fa-bd12-bfe48fb88eed";
const N8N_WEBHOOK_FALLBACK =
    "https://ahmedshaheen19.app.n8n.cloud/webhook-test/3120d6e3-7db3-4deb-a39d-b41c49919b0e";

export async function POST(request) {
    try {
        const body = await request.json();

        // 1) Validate token
        const expectedToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!expectedToken) {
            console.error("❌ TELEGRAM_BOT_TOKEN is not configured");
            return new Response(
                JSON.stringify({ error: "telegramBotToken is NOT configured" }),
                { status: 500 }
            );
        }

        const incomingToken = request.headers.get("X-Incoming-Token");
        if (incomingToken !== expectedToken) {
            console.warn("❌ Invalid token on /api/incoming-lead");
            return new Response(JSON.stringify({ error: "invalid token" }), {
                status: 401,
            });
        }

        console.log("🔥 Incoming lead received:", body);

        // 2) Load agents for this company (for round robin)
        const { data: agents, error: agentsError } = await supabase
            .from("agents")
            .select("*")
            .eq("company_id", COMPANY_ID)
            .order("order_index", { ascending: true });

        if (agentsError) {
            console.error("❌ Error loading agents:", agentsError);
            return new Response(JSON.stringify({ error: "failed to load agents" }), {
                status: 500,
            });
        }

        if (!agents || agents.length === 0) {
            console.error("❌ No agents found for round robin");
            return new Response(
                JSON.stringify({ error: "no agents configured for this company" }),
                { status: 500 }
            );
        }

        // 3) Determine next agent via round robin
        const { data: previousLogs, error: previousError } = await supabase
            .from("lead_logs")
            .select("selected_agent_index")
            .eq("company_id", COMPANY_ID)
            .not("selected_agent_index", "is", null)
            .order("created_at", { ascending: false })
            .limit(1);

        if (previousError) {
            console.error("⚠️ Error loading previous lead_logs:", previousError);
        }

        let nextIndex = 0;
        if (
            previousLogs &&
            previousLogs.length > 0 &&
            previousLogs[0].selected_agent_index != null
        ) {
            nextIndex = (previousLogs[0].selected_agent_index + 1) % agents.length;
        }

        const selectedAgent = agents[nextIndex];
        console.log("🎯 Selected agent:", {
            id: selectedAgent.id,
            name: selectedAgent.name,
            telegram_chat_id: selectedAgent.telegram_chat_id,
            order_index: selectedAgent.order_index,
        });

        // 4) Insert lead into lead_logs with assignment
        const leadLogPayload = {
            company_id: COMPANY_ID,
            lead_json: body, // raw lead data (name, phone, job, message, etc.)
            agent_id: selectedAgent.id,
            selected_agent_index: nextIndex,
            status: "sent",
            // this is just raw description/message if present; n8n will do full formatting
            lead_text: body.message ?? null,
        };

        const { data: leadLog, error: insertError } = await supabase
            .from("lead_logs")
            .insert([leadLogPayload])
            .select()
            .single();

        if (insertError) {
            console.error("❌ Supabase insert error:", insertError);
            return new Response(JSON.stringify({ error: "DB insert failed" }), {
                status: 500,
            });
        }

        console.log("✅ Lead stored in lead_logs:", leadLog.id);

        // 5) Call n8n webhook so it can format + send Telegram message
        const webhookUrl = process.env.N8N_WEBHOOK_URL || N8N_WEBHOOK_FALLBACK;

        if (webhookUrl) {
            try {
                const webhookRes = await fetch(webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        lead_log_id: leadLog.id,
                        company_id: COMPANY_ID,
                        agent: selectedAgent, // includes telegram_chat_id
                        lead: body, // raw lead data for n8n to format
                    }),
                });

                if (!webhookRes.ok) {
                    console.error(
                        "⚠️ n8n webhook responded with non-2xx:",
                        webhookRes.status
                    );
                }
            } catch (webhookErr) {
                console.error("⚠️ Error calling n8n webhook:", webhookErr);
            }
        } else {
            console.warn("⚠️ No N8N webhook URL configured");
        }

        // 6) Return a clean response for n8n / debugging
        return new Response(
            JSON.stringify({
                success: true,
                lead_log_id: leadLog.id,
                agent: {
                    id: selectedAgent.id,
                    name: selectedAgent.name,
                    telegram_chat_id: selectedAgent.telegram_chat_id,
                    order_index: selectedAgent.order_index,
                },
            }),
            { status: 200 }
        );
    } catch (err) {
        console.error("❌ Unhandled error in /api/incoming-lead:", err);
        return new Response(JSON.stringify({ error: "server error" }), {
            status: 500,
        });
    }
}
