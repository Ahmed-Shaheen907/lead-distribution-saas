import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req) {
    console.log("🔥 Incoming lead received");

    try {
        const body = await req.json();

        /* ===============================
           1️⃣ Read API key (HEADER OR BODY)
        =============================== */
        const companyApiKey =
            req.headers.get("x-company-key") ||
            body.company_api_key ||
            body.COMPANY_API_KEY;

        if (!companyApiKey) {
            console.error("❌ Missing company API key");
            return NextResponse.json(
                { error: "Missing API key" },
                { status: 401 }
            );
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
            console.error("❌ Invalid API key:", companyApiKey);
            return NextResponse.json(
                { error: "Invalid API key" },
                { status: 403 }
            );
        }

        const companyId = company.id;

        /* ===============================
           3️⃣ Normalize incoming body
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

        if (agentsError || !agents?.length) {
            console.error("❌ No agents for company:", companyId);
            return NextResponse.json(
                { error: "No agents found" },
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
           6️⃣ Build lead text
        =============================== */
        const leadText =
            `👤 Name: ${normalizedBody.name ?? "N/A"}\n` +
            `📞 Phone: ${normalizedBody.phone ?? "N/A"}\n` +
            `🧑‍💼 Job: ${normalizedBody.job_title ?? "N/A"}\n` +
            `📝 Description: ${normalizedBody.description ?? "N/A"}\n` +
            `📢 Ad: ${normalizedBody.ad_name ?? "N/A"}`;

        /* ===============================
           7️⃣ Insert lead
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
            console.error("❌ Lead insert error:", leadError);
            return NextResponse.json(
                { error: "Failed to store lead" },
                { status: 500 }
            );
        }

        /* ===============================
           9️⃣ Success
        =============================== */
        return NextResponse.json({
            success: true,
            company_id: companyId,
            agent: {
                id: selectedAgent.id,
                name: selectedAgent.name,
                telegram_chat_id: selectedAgent.telegram_chat_id,
                order_index: selectedAgent.order_index,
            },
        });


    } catch (err) {
        console.error("🔥 Unexpected error:", err);
        return NextResponse.json(
            { error: "Server error" },
            { status: 500 }
        );
    }
}
