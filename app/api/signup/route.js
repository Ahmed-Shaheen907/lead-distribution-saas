import { hash } from "bcrypt";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export async function POST(req) {
    try {
        const body = await req.json();
        const { email, password, company_name } = body;

        // 1) Create company
        const { data: company, error: cError } = await supabaseAdmin
            .from("companies")
            .insert([{ name: company_name }])
            .select()
            .single();

        if (cError) return Response.json({ error: "company creation failed" }, { status: 500 });

        // 2) Hash password
        const password_hash = await hash(password, 10);

        // 3) Create user linked to company
        const { error: uError } = await supabaseAdmin
            .from("users")
            .insert([
                { email, password_hash, company_id: company.id }
            ]);

        if (uError) return Response.json({ error: "user creation failed" }, { status: 500 });

        return Response.json({ success: true });
    } catch (err) {
        console.error(err);
        return Response.json({ error: "server error" }, { status: 500 });
    }
}
