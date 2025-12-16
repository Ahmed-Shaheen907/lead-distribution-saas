export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const N8N_WEBHOOK_URL =
    "https://ahmedshaheen19.app.n8n.cloud/webhook/374b3435-faf3-410f-84f0-8dad25ccdacb";

export async function POST(req) {
    console.log("🚀 DEPLOYED VERSION — WEBHOOK ENABLED");

    console.log("🔥 Incoming lead received");

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
            return NextResponse.json(
                { error: "Missing company API key" },
                { status: 401 }
            );
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
            return NextResponse.json(
                { error: "Invalid API key" },
                { status: 403 }
            );
        }

        const companyId = company.id;

        /* ===============================
           3️⃣ Normalize lead
        =============================== */
        const lead = {
            name: body.name || body.Name || null,
            phone: body.phone || body.Phone || null,
            job_title: body.job_title || body.Job_Title || null,
            description: body.description || body.Description || null,
            ad_name: body.ad_name || body["Ad Name"] || null,
            message: body.message || body.Message || null,
        };

        /* ===============================
           4️⃣ Pick agent
        =============================== */
        const { data: agents } = await supabase
            .from("agents")
            .select("*")
            .eq("company_id", companyId)
            .order("order_index", { ascending: true });

        if (!agents?.length) {
            return NextResponse.json(
                { error: "No agents found" },
                { status: 400 }
            );
        }

        const selectedAgent = agents[0];

        /* ===============================
           5️⃣ Rotate agents
        =============================== */
        const rotated = [...agents.slice(1), agents[0]].map((a, i) => ({
            ...a,
            order_index: i,
        }));

        await supabase.from("agents").upsert(rotated);

        /* ===============================
           6️⃣ Store lead
        =============================== */
        await supabase.from("lead_logs").insert({
            company_id: companyId,
            agent_id: selectedAgent.id,
            agent_name: selectedAgent.name,
            selected_agent_index: selectedAgent.order_index,
            lead_json: lead,
            status: "assigned",
        });

        /* ===============================
           7️⃣ CALL n8n WEBHOOK 🔥
        =============================== */
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
            }),
        });

        /* ===============================
           8️⃣ Response
        =============================== */
        return NextResponse.json({
            success: true,
            company_id: companyId,
            agent_id: selectedAgent.id,
            telegram_chat_id: selectedAgent.telegram_chat_id,
        });

    } catch (err) {
        console.error("🔥 Server error:", err);
        return NextResponse.json(
            { error: "Server error" },
            { status: 500 }
        );
    }
}
