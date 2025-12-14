import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req) {
    console.log("🔥 NEW CODE RUNNING — VERSION 2 — WITH AGENT + LEAD_TEXT");

    try {
        /* ===============================
           1️⃣ Parse request + API key
        =============================== */
        const body = await req.json();
        const companyApiKey = req.headers.get("x-company-key");

        if (!companyApiKey) {
            return NextResponse.json({ error: "Missing API key" }, { status: 401 });
        }

        /* ===============================
           2️⃣ Validate company
        =============================== */
        const { data: company, error: companyError } = await supabase
            .from("companies")
            .select("id")
            .eq("api_key", companyApiKey)
            .single();

        if (companyError || !company) {
            return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
        }

        const companyId = company.id;

        /* ===============================
           3️⃣ Normalize incoming body
           (THIS IS THE SECRET SAUCE)
        =============================== */
        const normalizedBody = {
            name: body.name || body.Name || null,
            phone: body.phone || body.Phone || null,
            job_title: body.job_title || body.Job_Title || null,
            description: body.description || body.Description || null,
            ad_name: body.ad_name || body["Ad Name"] || null,
            message: body.message || body.Message || null,
        };

        /* ===============================
           4️⃣ Fetch agents (round robin)
        =============================== */
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
           6️⃣ Build UI-friendly text
        =============================== */
        const leadText =
            `👤 Name: ${normalizedBody.name ?? "N/A"}\n` +
            `📞 Phone: ${normalizedBody.phone ?? "N/A"}\n` +
            `🧑‍💼 Job: ${normalizedBody.job_title ?? "N/A"}\n` +
            `📝 Description: ${normalizedBody.description ?? "N/A"}\n` +
            `📢 Ad: ${normalizedBody.ad_name ?? "N/A"}`;

        /* ===============================
           7️⃣ Insert lead (CORRECT ORDER)
        =============================== */
        const { error: leadError } = await supabase
            .from("lead_logs")
            .insert({
                company_id: companyId,

                lead_json: normalizedBody,
                lead_text: leadText,

                agent_id: selectedAgent.id,
                agent_name: selectedAgent.name,
                selected_agent_index: selectedAgent.order_index,

                status: "sent",
            });

        if (leadError) {
            console.log("Lead insert error:", leadError);
            return NextResponse.json({ error: "Failed to store lead" }, { status: 500 });
        }

        /* ===============================
           8️⃣ Send Telegram message
        =============================== */
        const telegramMsg =
            `📣 *New Lead Assigned*\n\n` +
            `👤 *Name:* ${normalizedBody.name ?? "N/A"}\n` +
            `📞 *Phone:* ${normalizedBody.phone ?? "N/A"}\n` +
            `🧑‍💼 *Job:* ${normalizedBody.job_title ?? "N/A"}\n` +
            `📢 *Ad:* ${normalizedBody.ad_name ?? "N/A"}`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: selectedAgent.telegram_chat_id,
                text: telegramMsg,
                parse_mode: "Markdown",
            }),
        });

        /* ===============================
           9️⃣ Success response
        =============================== */
        return NextResponse.json({
            success: true,
            sent_to: selectedAgent.name,
        });

    } catch (err) {
        console.error("Unexpected error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
