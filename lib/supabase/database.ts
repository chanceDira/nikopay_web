export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          preferred_msisdn: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          preferred_msisdn?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          preferred_msisdn?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chains: {
        Row: {
          id: "polygon" | "base";
          name: string;
          is_testnet: boolean;
          is_active: boolean;
          confirm_blocks: number;
          created_at: string;
        };
        Insert: {
          id: "polygon" | "base";
          name: string;
          is_testnet?: boolean;
          is_active?: boolean;
          confirm_blocks?: number;
          created_at?: string;
        };
        Update: {
          id?: "polygon" | "base";
          name?: string;
          is_testnet?: boolean;
          is_active?: boolean;
          confirm_blocks?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      tokens: {
        Row: {
          id: string;
          chain_id: "polygon" | "base";
          symbol: string;
          contract_address: string;
          decimals: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          chain_id: "polygon" | "base";
          symbol: string;
          contract_address: string;
          decimals?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          chain_id?: "polygon" | "base";
          symbol?: string;
          contract_address?: string;
          decimals?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      treasury_wallets: {
        Row: {
          id: string;
          chain_id: "polygon" | "base";
          token_id: string;
          address: string;
          label: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chain_id: "polygon" | "base";
          token_id: string;
          address: string;
          label?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chain_id?: "polygon" | "base";
          token_id?: string;
          address?: string;
          label?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fx_rates: {
        Row: {
          id: string;
          usdt_to_rwf: number;
          fee_percent: number;
          min_usdt: number;
          effective_from: string;
          effective_to: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          usdt_to_rwf: number;
          fee_percent: number;
          min_usdt: number;
          effective_from?: string;
          effective_to?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          usdt_to_rwf?: number;
          fee_percent?: number;
          min_usdt?: number;
          effective_from?: string;
          effective_to?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payment_intents: {
        Row: {
          id: string;
          user_id: string | null;
          wallet_address: string;
          status:
            | "awaiting_payment"
            | "detected"
            | "credited"
            | "payout_pending"
            | "paid"
            | "failed"
            | "expired"
            | "manual_review";
          chain_id: "polygon" | "base";
          msisdn: string;
          usdt_amount: number;
          rate: number;
          fee_percent: number;
          fee_rwf: number;
          net_rwf: number;
          treasury_address: string;
          expires_at: string;
          deposit_tx: string | null;
          momo_ref: string | null;
          notify_email: string | null;
          paid_notified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          wallet_address: string;
          status?:
            | "awaiting_payment"
            | "detected"
            | "credited"
            | "payout_pending"
            | "paid"
            | "failed"
            | "expired"
            | "manual_review";
          chain_id: "polygon" | "base";
          msisdn: string;
          usdt_amount: number;
          rate: number;
          fee_percent: number;
          fee_rwf: number;
          net_rwf: number;
          treasury_address: string;
          expires_at: string;
          deposit_tx?: string | null;
          momo_ref?: string | null;
          notify_email?: string | null;
          paid_notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          wallet_address?: string;
          status?:
            | "awaiting_payment"
            | "detected"
            | "credited"
            | "payout_pending"
            | "paid"
            | "failed"
            | "expired"
            | "manual_review";
          chain_id?: "polygon" | "base";
          msisdn?: string;
          usdt_amount?: number;
          rate?: number;
          fee_percent?: number;
          fee_rwf?: number;
          net_rwf?: number;
          treasury_address?: string;
          expires_at?: string;
          deposit_tx?: string | null;
          momo_ref?: string | null;
          notify_email?: string | null;
          paid_notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chain_deposits: {
        Row: {
          id: string;
          chain_id: "polygon" | "base";
          tx_hash: string;
          log_index: number;
          from_address: string;
          to_address: string;
          token_address: string;
          amount: number;
          block_number: number;
          observed_at: string;
        };
        Insert: {
          id?: string;
          chain_id: "polygon" | "base";
          tx_hash: string;
          log_index: number;
          from_address: string;
          to_address: string;
          token_address: string;
          amount: number;
          block_number: number;
          observed_at?: string;
        };
        Update: {
          id?: string;
          chain_id?: "polygon" | "base";
          tx_hash?: string;
          log_index?: number;
          from_address?: string;
          to_address?: string;
          token_address?: string;
          amount?: number;
          block_number?: number;
          observed_at?: string;
        };
        Relationships: [];
      };
      intent_deposits: {
        Row: {
          intent_id: string;
          deposit_id: string;
          matched_at: string;
        };
        Insert: {
          intent_id: string;
          deposit_id: string;
          matched_at?: string;
        };
        Update: {
          intent_id?: string;
          deposit_id?: string;
          matched_at?: string;
        };
        Relationships: [];
      };
      momo_transfers: {
        Row: {
          id: string;
          intent_id: string;
          reference_id: string;
          amount_rwf: number;
          msisdn: string;
          status: "pending" | "successful" | "failed" | "timeout";
          provider_ref: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          intent_id: string;
          reference_id: string;
          amount_rwf: number;
          msisdn: string;
          status?: "pending" | "successful" | "failed" | "timeout";
          provider_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          intent_id?: string;
          reference_id?: string;
          amount_rwf?: number;
          msisdn?: string;
          status?: "pending" | "successful" | "failed" | "timeout";
          provider_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      waitlist_entries: {
        Row: {
          id: string;
          email: string;
          role: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      chain_sync: {
        Row: {
          chain_id: "polygon" | "base";
          last_block: number;
          updated_at: string;
        };
        Insert: {
          chain_id: "polygon" | "base";
          last_block?: number;
          updated_at?: string;
        };
        Update: {
          chain_id?: "polygon" | "base";
          last_block?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
