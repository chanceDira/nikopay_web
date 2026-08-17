import type { ChainId } from "@/lib/settlement/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loadActiveUsdtToken(
  chain: ChainId,
) : Promise<
  | { ok: true; id: string; contractAddress: string }
  | { ok: false; reason: string }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tokens")
    .select("id, contract_address")
    .eq("chain_id", chain)
    .eq("symbol", "USDT")
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "token is not configured for this chain" };
  }

  return {
    ok: true,
    id: data.id,
    contractAddress: data.contract_address.toLowerCase(),
  };
}

export async function loadActiveTreasury(
  chain: ChainId,
) : Promise<{ ok: true; address: string } | { ok: false; reason: string }> {
  const token = await loadActiveUsdtToken(chain);
  if (!token.ok) {
    return token;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("treasury_wallets")
    .select("address")
    .eq("token_id", token.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "treasury is not configured for this chain" };
  }

  return { ok: true, address: data.address.toLowerCase() };
}
