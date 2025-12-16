import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req) {
    console.log("🔥 Incoming lead received");

    try {
        const body = await req.json();

        // 1) Read company API key (header OR body)
        const companyApiKey =
            req.headers.get("x-company-key") ||
            body.company_api_key ||
            body.COMPANY_API_KEY;

        if (!companyApiKey) {
            return NextResponse.json(
                { success: false, error: "Missing API key" },
                { status: 401 }
            );
        }

        // 2) Validate company by api_key
        const { data: company, error: companyError } = await supabase
            .from("companies")
            .select("id")
            .eq("api_key", companyApiKey)
            .single();

        if (companyError || !company) {
            return NextResponse.json(
                { success: false, error: "Invalid API key" },
                { status: 403 }
            );
        }

        const companyId = company.id;

        // 3) Normalize incoming body
        const normalizedBody = {
            name: body.name || body.Name || null,
            phone: body.phone || body.Phone || null,
            job_title: body.job_title || body.Job_Title || null,
            description: body.description || body.Description || null,
            ad_name: body.ad_name || body["Ad Name"] || null,
            message: body.message || body.Message || null,
        };

        // 4) Fetch agents (round robin order)
        const { data: agents, error: agentsError } = await supabase
            .from("agents")
            .select("id,name,telegram_chat_id,order_index")
            .eq("company_id", companyId)
            .order("order_index", { ascending: true });

        if (agentsError || !agents?.length) {
            return NextResponse.json(
                { success: false, error: "No agents found for this company" },
                { status: 400 }
            );
        }

        const selectedAgent = agents[0];

        // 5) Rotate agents (move first to end, reindex)
        const rotatedAgents = [...agents.slice(1), agents[0]].map((a, i) => ({
            ...a,
            order_index: i,
        }));

        const { error: rotateError } = await supabase
            .from("agents")
            .upsert(rotatedAgents, { onConflict: "id" });

        if (rotateError) {
            console.error("❌ Rotate error:", rotateError);
            // not fatal: we can still proceed
        }

        // 6) Build lead text
        const leadText =
            `👤 Name: ${normalizedBody.name ?? "N/A"}\n` +
            `📞 Phone: ${normalizedBody.phone ?? "N/A"}\n` +
            `🧑‍💼 Job: ${normalizedBody.job_title ?? "N/A"}\n` +
            `📝 Description: ${normalizedBody.description ?? "N/A"}\n` +
            `📢 Ad: ${normalizedBody.ad_name ?? "N/A"}`;

        // 7) Insert lead log
        const { error: leadError } = await supabase.from("lead_logs").insert({
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
                { success: false, error: "Failed to store lead" },
                { status: 500 }
            );
        }

        // ✅ 8) Return response WITH telegram_chat_id (TOP LEVEL)
        return NextResponse.json({
            success: true,
            company_id: companyId,

            // keep your existing field
            sent_to: selectedAgent.name,

            // ✅ add these so n8n sees them clearly
            agent_id: selectedAgent.id,
            telegram_chat_id: selectedAgent.telegram_chat_id,
            order_index: selectedAgent.order_index,
        });
    } catch (err) {
        console.error("🔥 Unexpected error:", err);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
