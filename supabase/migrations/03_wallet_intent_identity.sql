-- Wallet is the payer identity until SIWE lands.

alter table public.payment_intents
  alter column user_id drop not null;

alter table public.payment_intents
  add column wallet_address text not null
    check (wallet_address ~ '^0x[a-f0-9]{40}$');

create index payment_intents_wallet_created_idx
on public.payment_intents (wallet_address, created_at desc);

drop policy if exists payment_intents_insert_own on public.payment_intents;

update public.tokens
set is_active = true
where symbol = 'USDT';

update public.treasury_wallets
set is_active = true;
