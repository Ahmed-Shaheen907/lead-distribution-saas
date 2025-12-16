export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const TELEGRAM_BOT_TOKEN =
    "8549123258:AAGMXgvTuU7dm6voFSnHAUa6Z8eLQI8mNrU";

const N8N_WEBHOOK_URL =
    "https://ahmedshaheen19.app.n8n.cloud/webhook/374b3435-faf3-410f-84f0-8dad25ccdacb";

export async function POST(req) {
    try {
        const body = await req.json();

        /* 1️⃣ API KEY */
        const companyApiKey =
            req.headers.get("x-company-key") ||
            body.company_api_key ||
            body.COMPANY_API_KEY;

        if (!companyApiKey) {
            return NextResponse.json({ error: "Missing API key" }, { status: 401 });
        }

        /* 2️⃣ COMPANY */
        const { data: company } = await supabase
            .from("companies")
            .select("id")
            .eq("api_key", companyApiKey)
            .single();

        if (!company) {
            return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
        }

        const companyId = company.id;

        /* 3️⃣ NORMALIZE LEAD */
        const lead = {
            name: body.name || body.Name || "N/A",
            phone: body.phone || body.Phone || "N/A",
            job_title: body.job_title || body.Job_Title || "N/A",
            description: body.description || body.Description || "N/A",
            ad_name: body.ad_name || body["Ad Name"] || "N/A",
            message: body.message || body.Message || "N/A",
        };

        /* 4️⃣ AGENT (ROUND ROBIN) */
        const { data: agents } = await supabase
            .from("agents")
            .select("*")
            .eq("company_id", companyId)
            .order("order_index", { ascending: true });

        if (!agents?.length) {
            return NextResponse.json({ error: "No agents found" }, { status: 400 });
        }

        const selectedAgent = agents[0];

        /* 5️⃣ ROTATE */
        const rotated = [...agents.slice(1), agents[0]].map((a, i) => ({
            ...a,
            order_index: i,
        }));

        await supabase.from("agents").upsert(rotated);

        /* 6️⃣ SAVE LEAD */
        await supabase.from("lead_logs").insert({
            company_id: companyId,
            agent_id: selectedAgent.id,
            agent_name: selectedAgent.name,
            selected_agent_index: selectedAgent.order_index,
            lead_json: lead,
            status: "assigned",
        });

        /* 7️⃣ TELEGRAM TRY */
        let telegramSent = false;
        let telegramError = null;

        if (selectedAgent.telegram_chat_id) {
            const message =
                `📣 New Lead Assigned\n\n` +
                `👤 Name: ${lead.name}\n` +
                `📞 Phone: ${lead.phone}\n` +
                `🧑‍💼 Job: ${lead.job_title}\n` +
                `📢 Ad: ${lead.ad_name}\n\n` +
                `${lead.message}`;

            try {
                const tgRes = await fetch(
                    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: selectedAgent.telegram_chat_id,
                            text: message,
                        }),
                    }
                );

                const tgData = await tgRes.json();

                if (tgData.ok) telegramSent = true;
                else telegramError = tgData;
            } catch (err) {
                telegramError = err.message;
            }
        }

        /* 8️⃣ FALLBACK → N8N */
        if (!telegramSent && N8N_WEBHOOK_URL) {
            await fetch(N8N_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company_id: companyId,
                    agent: {
                        id: selectedAgent.id,
                        name: selectedAgent.name,
                        telegram_chat_id: selectedAgent.telegram_chat_id,
                    },
                    lead,
                    reason: "telegram_failed",
                    error: telegramError,
                }),
            });
        }

        /* 9️⃣ RESPONSE */
        return NextResponse.json({
            success: true,
            company_id: companyId,
            telegram_sent: telegramSent,
            fallback_to_n8n: !telegramSent,
            agent_id: selectedAgent.id,
        });

    } catch (err) {
        console.error("🔥 Incoming lead fatal error:", err);
        return NextResponse.json(
            { error: err.message || "Server error" },
            { status: 500 }
        );
    }
}
