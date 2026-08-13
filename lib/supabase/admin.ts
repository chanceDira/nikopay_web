import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getNodeRealtimeOptions } from "@/lib/supabase/realtime";

export function createAdminClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...getNodeRealtimeOptions(),
  });
}
