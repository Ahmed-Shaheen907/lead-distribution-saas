import { createClient } from "@supabase/supabase-js";

// THIS CLIENT WILL NEVER BREAK THE BUILD
export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

