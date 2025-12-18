import { createClient } from "@supabase/supabase-js";

// ⚠️ Note: This must use the SERVICE_ROLE_KEY, not the Anon Key.
// The Service Role Key bypasses all RLS (Row Level Security) rules.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});