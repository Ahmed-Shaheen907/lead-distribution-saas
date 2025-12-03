import { createClient } from "@supabase/supabase-js";

// THIS CLIENT WILL NEVER BREAK THE BUILD
export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
