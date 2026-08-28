import type { Database } from "@/lib/supabase/database";

export type PublicSchema = Database["public"];
export type Tables = PublicSchema["Tables"];
export type TableName = keyof Tables;

export type ProfileRow = Tables["profiles"]["Row"];
export type ChainRow = Tables["chains"]["Row"];
export type TokenRow = Tables["tokens"]["Row"];
export type TreasuryWalletRow = Tables["treasury_wallets"]["Row"];
export type FxRateRow = Tables["fx_rates"]["Row"];
export type PaymentIntentRow = Tables["payment_intents"]["Row"];
export type ChainDepositRow = Tables["chain_deposits"]["Row"];
export type ChainSyncRow = Tables["chain_sync"]["Row"];
export type MomoTransferRow = Tables["momo_transfers"]["Row"];
export type PayoutTransferRow = Tables["payout_transfers"]["Row"];
