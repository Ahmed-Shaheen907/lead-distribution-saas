import { hash } from "bcrypt";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const body = await req.json();
        const { email, password, company_name } = body;

        console.log("📝 Attempting signup for:", email);

        // 1. Create company
        const { data: companyData, error: cError } = await supabaseAdmin
            .from("companies")
            .insert([{ name: company_name }])
            .select();

        if (cError) {
            console.error("❌ Company Creation Error:", cError);
            return NextResponse.json({ error: `Company Error: ${cError.message}` }, { status: 500 });
        }

        // CORRECTED: Get the object from the array returned by .select()
        const company = companyData?.[0];

        if (!company) {
            return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
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
                    company_id: company.id // Now company.id exists correctly
                }
            ]);

        if (uError) {
            console.error("❌ User Creation Error:", uError);
            // Rollback: Delete the company if user creation fails
            await supabaseAdmin.from("companies").delete().eq("id", company.id);
            return NextResponse.json({ error: `User Error: ${uError.message}` }, { status: 500 });
        }

        // 4. Initialize Subscription (Required for Middleware)
        const { error: subError } = await supabaseAdmin
            .from("subscriptions")
            .insert([
                {
                    company_id: company.id,
                    status: "inactive", // Stays inactive until they pay
                    plan: "Pro",        // Default plan selection
                }
            ]);

        if (subError) {
            console.error("❌ Subscription Init Error:", subError);
            // We don't necessarily want to block signup if only the sub row fails, 
            // but logging it is critical.
        } else {
            console.log("✅ Subscription initialized for company:", company.id);
        }

        // 4. Create initial inactive subscription
        await supabaseAdmin.from("subscriptions").insert([{
            company_id: company.id,
            status: "inactive",
            ends_at: new Date().toISOString()
        }]);

        console.log("🚀 Signup Complete!");
        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("🔥 Server Exception:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}