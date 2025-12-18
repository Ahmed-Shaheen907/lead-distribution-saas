import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export async function POST(req) {
    try {
        const body = await req.json();
        const { searchParams } = new URL(req.url);

        // 1. Get the HMAC sent by Paymob from the query string
        const hmac = searchParams.get("hmac");

        // 2. Extract transaction data
        const obj = body.obj;
        if (!obj) return NextResponse.json({ error: "No data" }, { status: 400 });

        // 3. Prepare fields for HMAC calculation (Strict order required by Paymob)
        // These fields must be concatenated in this exact order
        const {
            amount_cents,
            created_at,
            currency,
            error_occured,
            has_parent_transaction,
            id: transaction_id,
            integration_id,
            is_3d_secure,
            is_auth,
            is_capture,
            is_refunded,
            is_standalone_payment,
            is_voided,
            order,
            owner,
            pending,
            source_data,
            success
        } = obj;

        const hmacString =
            amount_cents +
            created_at +
            currency +
            error_occured +
            has_parent_transaction +
            transaction_id +
            integration_id +
            is_3d_secure +
            is_auth +
            is_capture +
            is_refunded +
            is_standalone_payment +
            is_voided +
            order.id +
            owner +
            pending +
            source_data.pan +
            source_data.sub_type +
            source_data.type +
            success;

        // 4. Calculate HMAC using your Secret Key
        const hashedHmac = crypto
            .createHmac("sha512", process.env.PAYMOB_HMAC_SECRET)
            .update(hmacString)
            .digest("hex");

        // 5. Verify Authenticity
        if (hashedHmac !== hmac) {
            console.error("❌ HMAC Verification Failed");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 6. If Payment Successful, Update Subscription
        if (success === true || success === "true") {
            const companyId = order.shipping_data?.extra_description; // We usually pass company_id here during checkout

            if (!companyId) {
                console.error("❌ No company ID found in metadata");
                return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
            }

            // Calculate expiration (e.g., 30 days from now)
            const endsAt = new Date();
            endsAt.setDate(endsAt.getDate() + 30);

            const { error: subError } = await supabaseAdmin
                .from("subscriptions")
                .upsert({
                    company_id: companyId,
                    plan: "Pro", // Or dynamic based on amount
                    status: "active",
                    starts_at: new Date().toISOString(),
                    ends_at: endsAt.toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'company_id' });

            if (subError) {
                console.error("❌ DB Update Error:", subError);
                return NextResponse.json({ error: "Database update failed" }, { status: 500 });
            }

            console.log(`✅ Subscription activated for Company: ${companyId}`);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("🔥 Paymob Webhook Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}