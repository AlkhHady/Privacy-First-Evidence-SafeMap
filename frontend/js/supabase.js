import {
  createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from "./config.js";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Konfigurasi Supabase belum diisi di config.js"
  );
}

if (!SUPABASE_URL.startsWith("https://")) {
  throw new Error("SUPABASE_URL tidak valid.");
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
