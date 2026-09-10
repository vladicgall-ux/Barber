import { createClient } from '@supabase/supabase-js';

// Public (browser-safe) client — anon key, read-only via RLS policies.
export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
