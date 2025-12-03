export const runtime = "nodejs";

import { supabase } from "@/lib/supabaseClient";

export async function POST(request) {
    try {
        const body = await request.json();

        // Validate token
        const expectedToken = process.env.TELEGRAM_BOT_TOKEN;
        const incomingToken = request.headers.get("X-Incoming-Token");

        if (!expectedToken) {
            return new Response(JSON.stringify({ error: "telegramBotToken is NOT configured" }), { status: 500 });
        }
        if (incomingToken !== expectedToken) {
            return new Response(JSON.stringify({ error: "invalid token" }), { status: 401 });
        }

        console.log("🔥 Incoming lead received:", body);

        // ==========================
        // 1️⃣ INSERT LEAD INTO TABLE
        // ==========================

        const companyId = "c1fd70c2-bb2e-46fa-bd12-bfe48fb88eed"; // temp until auth added

        const { data: leadRow, error: insertError } = await supabase
            .from("lead_logs")
            .insert([
                {
                    company_id: companyId,
                    lead_json: body,
                    status: "received"
                }
            ])
            .select()
            .single();

        if (insertError) {
            console.error("Supabase Insert Error:", insertError);
            return new Response(JSON.stringify({ error: "DB insert failed" }), { status: 500 });
        }

        console.log("✅ Lead saved:", leadRow.id);

        // ==========================
        // 2️⃣ GET AGENTS FOR COMPANY
        // ==========================

        const { data: agents, error: agentsError } = await supabase
            .from("agents")
            .select("*")
            .eq("company_id", companyId)
            .order("order_index", { ascending: true });

        if (agentsError || agents.length === 0) {
            console.error("No agents found for round robin");
            return new Response(JSON.stringify({ error: "No agents found" }), { status: 500 });
        }

        // ==========================
        // 3️⃣ ROUND ROBIN SELECTION
        // ==========================

        const { data: previousLogs } = await supabase
            .from("lead_logs")
            .select("selected_agent_index")
            .eq("company_id", companyId)
            .not("selected_agent_index", "is", null)
            .order("created_at", { ascending: false })
            .limit(1);

        let nextIndex = 0;

        if (previousLogs && previousLogs.length > 0) {
            nextIndex = (previousLogs[0].selected_agent_index + 1) % agents.length;
        }

        const selectedAgent = agents[nextIndex];

        console.log("🎯 Selected Agent:", selectedAgent);

        // =====================================
        // 4️⃣ UPDATE LEAD WITH SELECTED AGENT
        // =====================================

        const { error: updateError } = await supabase
            .from("lead_logs")
            .update({
                agent_id: selectedAgent.id,
                selected_agent_index: nextIndex,
                status: "sent"
            })
            .eq("id", leadRow.id);

        if (updateError) {
            console.error("Error updating lead:", updateError);
        }

        // ==========================
        // 5️⃣ TRIGGER N8N WEBHOOK
        // ==========================

        const webhookUrl = process.env.N8N_WEBHOOK_URL;

        if (webhookUrl) {
            await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lead: leadRow,
                    agent: selectedAgent
                })
            });
        } else {
            console.warn("⚠️ No N8N_WEBHOOK_URL configured.");
        }

        return new Response(JSON.stringify({ success: true, agent: selectedAgent }), { status: 200 });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: "server error" }), { status: 500 });
    }
}
