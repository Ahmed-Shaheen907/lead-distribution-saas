import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
        .from("companies")
        .select("api_key")
        .eq("id", session.user.company_id)
        .single();

    if (error) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ api_key: data.api_key });
}
