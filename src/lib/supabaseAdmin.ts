// Server-only Supabase admin client.
// This uses the service role key, so it can bypass RLS and must only be used
// after a route has validated the user's session and ownership/access rules.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

type SupabaseDatabase = {
  public: {
    Tables: Record<string, SupabaseTable>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let adminClient: SupabaseClient<SupabaseDatabase> | null = null;

// Lazily creates a singleton admin client. Keeping this lazy avoids build-time
// env validation failures while still surfacing a clear runtime error.
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  adminClient ??= createClient<SupabaseDatabase>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return adminClient;
}
