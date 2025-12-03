export const runtime = "nodejs";

export async function POST() {
    return new Response(JSON.stringify({
        message: "XDEBUG ACTIVE",
        env: Object.keys(process.env)
    }), { status: 200 });
}
