export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const TELEGRAM_BOT_TOKEN = '8549123258:AAGMXgvTuU7dm6voFSnHAUa6Z8eLQI8mNrU';

export async function POST(req) {
    try {
        const body = await req.json();

        /* ===============================
           1️⃣ Read company API key
        =============================== */
        const companyApiKey =
            req.headers.get("x-company-key") ||
            body.company_api_key ||
            body.COMPANY_API_KEY;

        if (!companyApiKey) {
            return NextResponse.json({ error: "Missing API key" }, { status: 401 });
        }

        /* ===============================
           2️⃣ Validate company
        =============================== */
        const { data: company } = await supabase
            .from("companies")
            .select("id")
            .eq("api_key", companyApiKey)
            .single();

        if (!company) {
            return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
        }

        const companyId = company.id;

        /* ===============================
           3️⃣ Normalize lead
        =============================== */
        const lead = {
            name: body.name || body.Name || "N/A",
            phone: body.phone || body.Phone || "N/A",
            job_title: body.job_title || body.Job_Title || "N/A",
            description: body.description || body.Description || "N/A",
            ad_name: body.ad_name || body["Ad Name"] || "N/A",
            message: body.message || body.Message || "N/A",
        };

        /* ===============================
           4️⃣ Pick agent (round robin)
        =============================== */
        const { data: agents } = await supabase
            .from("agents")
            .select("*")
            .eq("company_id", companyId)
            .order("order_index", { ascending: true });

        if (!agents?.length) {
            return NextResponse.json({ error: "No agents found" }, { status: 400 });
        }

        const selectedAgent = agents[0];

        /* ===============================
           5️⃣ Rotate agents
        =============================== */
        const rotatedAgents = [...agents.slice(1), agents[0]].map((a, i) => ({
            ...a,
            order_index: i,
        }));

        await supabase.from("agents").upsert(rotatedAgents);

        /* ===============================
           6️⃣ Store lead
        =============================== */
        await supabase.from("lead_logs").insert({
            company_id: companyId,
            agent_id: selectedAgent.id,
            agent_name: selectedAgent.name,
            selected_agent_index: selectedAgent.order_index,
            lead_json: lead,
            status: "sent",
        });

        /* ===============================
           7️⃣ SEND TELEGRAM MESSAGE 🔥
        =============================== */
        if (!TELEGRAM_BOT_TOKEN) {
            throw new Error("TELEGRAM_BOT_TOKEN is missing");
        }

        if (!selectedAgent.telegram_chat_id) {
            throw new Error("Agent telegram_chat_id is missing");
        }

        const telegramMessage =
            `📣 *New Lead Assigned*\n\n` +
            `👤 *Name:* ${lead.name}\n` +
            `📞 *Phone:* ${lead.phone}\n` +
            `🧑‍💼 *Job:* ${lead.job_title}\n` +
            `📢 *Ad:* ${lead.ad_name}\n\n` +
            `📝 ${lead.message}`;

        const tgRes = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: selectedAgent.telegram_chat_id,
                    text: telegramMessage,
                    parse_mode: "Markdown",
                }),
            }
        );

        const tgData = await tgRes.json();

        if (!tgData.ok) {
            console.error("Telegram error:", tgData);
            throw new Error("Telegram message failed");
        }

        /* ===============================
           8️⃣ Response
        =============================== */
        return NextResponse.json({
            success: true,
            company_id: companyId,
            agent: {
                id: selectedAgent.id,
                name: selectedAgent.name,
                telegram_chat_id: selectedAgent.telegram_chat_id,
            },
        });

    } catch (err) {
        console.error("🔥 Incoming lead error:", err);
        return NextResponse.json(
            { error: err.message || "Server error" },
            { status: 500 }
        );
    }
}
