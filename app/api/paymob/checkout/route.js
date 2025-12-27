import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import https from "https";

export async function POST(req) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id) return NextResponse.json({ error: "No session" }, { status: 401 });

    try {
        const payload = JSON.stringify({
            amount: 50000,
            currency: "EGP",
            payment_methods: [parseInt(process.env.PAYMOB_INTEGRATION_ID)],
            billing_data: {
                first_name: "User", last_name: "NA",
                email: session.user.email,
                phone_number: "01000000000",
                street: "NA", building: "NA", floor: "NA", apartment: "NA",
                city: "Cairo", country: "EG", state: "Cairo"
            },
            extras: { company_id: session.user.company_id }
        });

        // WE USE A PROMISE + HTTPS AGENT TO FORCE IPV4
        const data = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.paymob.com',
                path: '/v1/intention',
                method: 'POST',
                headers: {
                    'Authorization': `Token ${process.env.PAYMOB_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                // This forces the request to ignore IPv6 and use IPv4
                family: 4
            };

            const postReq = https.request(options, (res) => {
                let chunks = '';
                res.on('data', (d) => { chunks += d; });
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(chunks) });
                    } catch (e) {
                        reject(new Error("Invalid JSON from Paymob"));
                    }
                });
            });

            postReq.on('error', (e) => reject(e));
            postReq.write(payload);
            postReq.end();
        });

        if (data.status >= 400) {
            console.error("❌ Paymob Rejected:", data.body);
            return NextResponse.json({ error: data.body.detail || "API Error" }, { status: data.status });
        }

        console.log("✅ SUCCESS: Client Secret obtained!");
        return NextResponse.json({ paymentToken: data.body.client_secret });

    } catch (err) {
        console.error("🔥 NETWORK BYPASS FAILED:", err.message);
        return NextResponse.json({ error: "Connection to Paymob failed. Try restarting your terminal." }, { status: 500 });
    }
}