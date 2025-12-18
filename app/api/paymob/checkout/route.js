import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Authentication Request
        const authRes = await fetch("https://egypt.paymob.com/api/auth/tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
        });

        const authData = await authRes.json();
        if (!authRes.ok) throw new Error(`Auth Failed: ${JSON.stringify(authData)}`);
        const token = authData.token;

        // 2. Order Registration
        const orderRes = await fetch("https://egypt.paymob.com/api/ecommerce/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                auth_token: token,
                delivery_needed: "false",
                amount_cents: 50000, // 500.00 EGP as integer
                currency: "EGP",
                shipping_data: {
                    extra_description: session.user.company_id, // For Webhook tracking
                    first_name: "User",
                    last_name: session.user.id.substring(0, 5),
                    email: session.user.email,
                    phone_number: "01000000000",
                }
            }),
        });

        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(`Order Failed: ${JSON.stringify(orderData)}`);

        // 3. Payment Key Generation
        const keyRes = await fetch("https://egypt.paymob.com/api/acceptance/payment_keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                auth_token: token,
                amount_cents: 50000,
                expiration: 3600,
                order_id: orderData.id,
                billing_data: {
                    first_name: "Clarity",
                    last_name: "User",
                    email: session.user.email,
                    phone_number: "01000000000",
                    currency: "EGP",
                    street: "NA",
                    building: "NA",
                    floor: "NA",
                    apartment: "NA",
                    city: "Cairo",
                    country: "EG",
                    state: "Cairo"
                },
                currency: "EGP",
                integration_id: parseInt(process.env.PAYMOB_INTEGRATION_ID), // Ensure it's a number
            }),
        });

        const keyData = await keyRes.json();
        if (!keyRes.ok) throw new Error(`Payment Key Failed: ${JSON.stringify(keyData)}`);

        return NextResponse.json({ paymentToken: keyData.token });

    } catch (err) {
        console.error("🔥 PAYMOB CHECKOUT ERROR:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}