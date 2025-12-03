export async function POST(request) {
    const expectedToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!expectedToken) {
        return new Response(JSON.stringify({ error: "ENV NOT LOADED" }), {
            status: 500,
        });
    }

    const incomingToken = request.headers.get("X-Incoming-Token");

    if (!incomingToken) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
            status: 400,
        });
    }

    if (incomingToken !== expectedToken) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
            status: 401,
        });
    }

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
    });
}
