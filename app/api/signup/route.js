import { hash } from "bcrypt";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const body = await req.json();
        const { email, password, company_name } = body;

        console.log("📝 Attempting signup for:", email);

        // 1. Create company
        const { data: company, error: cError } = await supabaseAdmin
            .from("companies")
            .insert([{ name: company_name }])
            .select() // Important to return the ID
            .single();

        if (cError) {
            console.error("❌ Company Creation Error:", cError);
            return NextResponse.json({ error: `Company Error: ${cError.message}` }, { status: 500 });
        }

        console.log("✅ Company created:", company.id);

        // 2. Hash password
        const password_hash = await hash(password, 10);

        // 3. Create user linked to company
        const { error: uError } = await supabaseAdmin
            .from("users")
            .insert([
                {
                    email,
                    password_hash,
                    company_id: company.id
                }
            ]);

        if (uError) {
            console.error("❌ User Creation Error:", uError);
            // Rollback: Delete the company if user creation fails to prevent orphans
            await supabaseAdmin.from("companies").delete().eq("id", company.id);

            return NextResponse.json({ error: `User Error: ${uError.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("🔥 Server Exception:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}