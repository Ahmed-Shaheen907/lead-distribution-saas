import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Your Telegram bot token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req) {
    try {
        const body = await req.json();
        const companyApiKey = req.headers.get("x-company-key");

        if (!companyApiKey) {
            return NextResponse.json({ error: "Missing API key" }, { status: 401 });
        }

        // 1️⃣ Validate API key → find company
        const { data: company, error: companyError } = await supabase
            .from("companies")
            .select("id")
            .eq("api_key", companyApiKey)
            .single();

        if (companyError || !company) {
            return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
        }

        const companyId = company.id;

        // Build readable lead text for UI + logs
        const leadText =
            `👤 Name: ${body.name || body.Name || "N/A"}\n` +
            `📞 Phone: ${body.phone || body.Phone || "N/A"}\n` +
            `🧑‍💼 Job: ${body.job_title || body.Job_Title || "N/A"}\n` +
            `📝 Description: ${body.description || body.Description || "N/A"}`;

        // 2️⃣ Insert lead into database
        const { data: lead, error: leadError } = await supabase
            .from("lead_logs")
            .insert({
                company_id: companyId,
                lead_json: body,

                // ✅ REQUIRED for Lead Logs UI
                lead_text: leadText,
                agent_id: selectedAgent.id,
                agent_name: selectedAgent.name,
                selected_agent_index: selectedAgent.order_index,

                status: "sent",
            })
            .select()
            .single();


        if (leadError) {
            console.log("Lead insert error:", leadError);
            return NextResponse.json(
                { error: "Failed to store lead" },
                { status: 500 }
            );
        }

        // 3️⃣ Fetch agents for round robin
        const { data: agents, error: agentsError } = await supabase
            .from("agents")
            .select("*")
            .eq("company_id", companyId)
            .order("order_index", { ascending: true });

        if (agentsError || !agents.length) {
            return NextResponse.json(
                { error: "No agents found for this company" },
                { status: 400 }
            );
        }

        // Pick first agent in sorted list
        const selectedAgent = agents[0];

        // 4️⃣ Rotate the agent order (round robin)
        const rotatedAgents = [...agents.slice(1), agents[0]];

        // Update indexes
        for (let i = 0; i < rotatedAgents.length; i++) {
            rotatedAgents[i].order_index = i;
        }

        await supabase.from("agents").upsert(rotatedAgents);

        // 5️⃣ Send lead to agent via Telegram
        const msg = `📣 *New Lead Assigned*\n\n` +
            `👤 *Name:* ${body.name || "N/A"}\n` +
            `📞 *Phone:* ${body.phone || "N/A"}\n` +
            `📝 *Notes:* ${body.notes || "None"}\n\n` +
            `🚀 *You are next in the rotation*`;

        await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: selectedAgent.telegram_chat_id,
                    text: msg,
                    parse_mode: "Markdown",
                }),
            }
        );

        // 6️⃣ Return success
        return NextResponse.json({
            success: true,
            message: "Lead stored and sent to agent",
            sent_to: selectedAgent.name,
        });
    } catch (err) {
        console.log("Unexpected error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
