-- Persist the last confirmed block scanned per chain

create table public.chain_sync (
  chain_id text primary key references public.chains (id),
  last_block bigint not null default 0
    check (last_block >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger chain_sync_set_updated_at
before update on public.chain_sync
for each row
execute function public.set_updated_at();

alter table public.chain_sync enable row level security;
