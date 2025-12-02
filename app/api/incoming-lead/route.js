import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase admin client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
    try {
        const body = await req.json();

        // 1️⃣ Read your incoming token from header
        const incomingToken = req.headers.get("X-Incoming-Token");
        if (!incomingToken)
            return NextResponse.json({ error: "Missing token" }, { status: 400 });

        // 2️⃣ Find the routing rule using the token
        const { data: routingRule, error: routingError } = await supabase
            .from("routing_rules")
            .select("*")
            .eq("telegram_bot_token", incomingToken)   // <—— this is the line you asked about
            .single();



        if (routingError || !routingRule)
            return NextResponse.json({ error: "Invalid bot token" }, { status: 404 });

        const companyId = "c1fd70c2-bb2e-46fa-bd12-bfe48fb88eed";
        console.log("DEBUG: Using companyId:", companyId);

        // fetch routing rule
        const { data: rule, error: ruleError } = await supabase
            .from("routing_rules")
            .select("*")
            .eq("company_id", companyId)
            .single();

        console.log("DEBUG: Found rule:", rule);
        console.log("DEBUG: ruleError:", ruleError);

        // 3️⃣ Load agents belonging to this company
        const { data: agents, error: agentError } = await supabase
            .from("agents")
            .select("*")
            .eq("company_id", companyId);

        if (agentError) throw agentError;
        if (!agents || agents.length === 0)
            return NextResponse.json(
                { error: "No agents found for this company" },
                { status: 400 }
            );

        // 4️⃣ Apply Round Robin routing
        let index = routingRule.last_agent_index || 0;
        const selectedAgent = agents[index % agents.length];

        // 5️⃣ Insert lead log
        const { error: logError } = await supabase.from("lead_logs").insert({
            company_id: companyId,
            agent_id: selectedAgent.id,
            lead_json: body,
            lead_text: body?.message?.text || null,
            selected_agent_index: index,
            status: "sent",
        });

        if (logError) throw logError;

        // 6️⃣ Forward message to selected agent (Telegram)
        const agentChatId = selectedAgent.telegram_chat_id;
        const messageText =
            body?.message?.text || "📩 New Lead Received (No Message Content)";

        const sendMessageUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        await fetch(sendMessageUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: agentChatId,
                text: `🔥 *New Lead Assigned* 🔥\n\n${messageText}`,
                parse_mode: "Markdown",
            }),
        }).catch(() => { });

        // 7️⃣ Update last_agent_index (Round Robin)
        const newIndex = (index + 1) % agents.length;

        await supabase
            .from("routing_rules")
            .update({ last_agent_index: newIndex })
            .eq("id", routingRule.id);

        return NextResponse.json({
            status: "ok",
            assigned_to: selectedAgent.name,
            agent_chat_id: agentChatId,
        });
    } catch (err) {
        console.error("Routing API ERROR:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
