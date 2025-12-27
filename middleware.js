import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // 1. PUBLIC PATHS
    if (
        pathname.startsWith("/api/paymob") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/signup") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // 2. AUTH CHECK
    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // 3. SUBSCRIPTION CHECK (DIRECT FETCH)
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const res = await fetch(
            `${supabaseUrl}/rest/v1/subscriptions?company_id=eq.${token.company_id}&status=eq.active&select=*`,
            {
                headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                },
                // CACHE: This is critical to prevent "Fetch Failed" on high frequency
                next: { revalidate: 60 }
            }
        );

        const subscriptions = await res.json();
        const hasActiveSub = subscriptions && subscriptions.length > 0;

        // 4. NAVIGATION LOGIC
        if (!hasActiveSub && pathname !== "/billing") {
            return NextResponse.redirect(new URL("/billing", req.url));
        }

        if (hasActiveSub && pathname === "/billing") {
            return NextResponse.redirect(new URL("/", req.url));
        }

    } catch (error) {
        console.error("Middleware Fetch Error:", error.message);
        // If Supabase check fails, don't lock the user out, just let them through 
        // to avoid a dead-end "Fetch Failed" screen.
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};