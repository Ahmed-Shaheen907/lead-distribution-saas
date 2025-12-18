import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // 1. PUBLIC PATHS: Always allow these
    // Inside your middleware.js
    if (
        pathname.startsWith("/api/paymob") || // Allow all paymob API routes
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/signup") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // 2. AUTH CHECK: Redirect to login if no session
    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // 3. SUBSCRIPTION CHECK
    // We check Supabase directly via REST API because Middleware runs on Edge
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await fetch(
        `${supabaseUrl}/rest/v1/subscriptions?company_id=eq.${token.company_id}&status=eq.active&select=*`,
        {
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
            },
        }
    );

    const subscriptions = await res.json();
    const hasActiveSub = subscriptions && subscriptions.length > 0;

    // 4. LOCKDOWN: If not paid, only allow the /billing page
    if (!hasActiveSub && pathname !== "/billing") {
        return NextResponse.redirect(new URL("/billing", req.url));
    }

    // 5. PREVENT DOUBLE PAY: If paid, don't let them go back to /billing
    if (hasActiveSub && pathname === "/billing") {
        return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};