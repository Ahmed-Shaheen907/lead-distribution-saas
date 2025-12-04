import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

const COMPANY_ID = "c1fd70c2-bb2e-46fa-bd12-bfe48fb88eed";
const N8N_WEBHOOK_FALLBACK =
    "https://ahmedshaheen19.app.n8n.cloud/webhook/3120d6e3-7db3-4deb-a39d-b41c49919b0e";

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

        // 2) Load agents
        const { data: agents, error: agentsError } = await supabase
            .from("agents")
            .select("*")
            .eq("company_id", COMPANY_ID)
            .order("order_index", { ascending: true });

        if (agentsError || !agents?.length) {
            console.error("❌ Error loading agents:", agentsError);
            return new Response(
                JSON.stringify({ error: "no agents configured for this company" }),
                { status: 500 }
            );
        }

        // 3) Determine next agent (round robin)
        const { data: previousLogs } = await supabase
            .from("lead_logs")
            .select("selected_agent_index")
            .eq("company_id", COMPANY_ID)
            .not("selected_agent_index", "is", null)
            .order("created_at", { ascending: false })
            .limit(1);

        let nextIndex = 0;
        if (previousLogs?.length > 0) {
            nextIndex = (previousLogs[0].selected_agent_index + 1) % agents.length;
        }

        const selectedAgent = agents[nextIndex];

        console.log("🎯 Selected agent:", {
            id: selectedAgent.id,
            name: selectedAgent.name,
            telegram_chat_id: selectedAgent.telegram_chat_id,
            order_index: selectedAgent.order_index,
        });

        // 4) INSERT lead into lead_logs WITH agent_name added
        const leadLogPayload = {
            company_id: COMPANY_ID,
            lead_json: body,
            agent_id: selectedAgent.id,
            agent_name: selectedAgent.name, // 🔥 FIX HERE
            selected_agent_index: nextIndex,
            status: "sent",
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

        console.log("✅ Lead stored:", leadLog.id);

        // 5) Trigger n8n
        const webhookUrl = process.env.N8N_WEBHOOK_URL || N8N_WEBHOOK_FALLBACK;

        if (webhookUrl) {
            try {
                const webhookRes = await fetch(webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        lead_log_id: leadLog.id,
                        company_id: COMPANY_ID,
                        agent: selectedAgent,
                        lead: body,
                    }),
                });

                if (!webhookRes.ok) {
                    console.error("⚠️ n8n webhook error:", webhookRes.status);
                }
            } catch (err) {
                console.error("⚠️ Error calling n8n webhook:", err);
            }
        }

        // 6) Return clean API response
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
        console.error("❌ Unhandled error:", err);
        return new Response(JSON.stringify({ error: "server error" }), {
            status: 500,
        });
    }
}
