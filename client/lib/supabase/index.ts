export { createClient as createBrowserClient } from "@/lib/supabase/client";
export { createClient as createServerClient } from "@/lib/supabase/server";
export { createAdminClient } from "@/lib/supabase/admin";
export type { Database } from "@/lib/supabase/database";
export type {
  ChainRow,
  FxRateRow,
  PaymentIntentRow,
  ProfileRow,
  TokenRow,
  TreasuryWalletRow,
} from "@/lib/supabase/types";
