export const runtime = "nodejs";

export async function POST(request) {
    try {
        const body = await request.json();

        const expectedToken = process.env.TELEGRAM_BOT_TOKEN;

        console.log(expectedToken);
        console.log('niggagasgagsgasg');

        if (!expectedToken) {
            return new Response(JSON.stringify({ error: "telegramBotToken is NOT configured" }), {
                status: 500,
            });
        }

        // Check header
        const incomingToken = request.headers.get("X-Incoming-Token");

        if (incomingToken !== expectedToken) {
            return new Response(JSON.stringify({ error: "invalid token" }), {
                status: 401,
            });
        }

        console.log("🔥 Incoming lead received:", body);

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: "server error" }), { status: 500 });
    }
}
