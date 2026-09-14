-- Unique on-chain send amount per open intent (shared treasury matching)

alter table public.payment_intents
  add column if not exists pay_usdt numeric(18, 6);

update public.payment_intents
set pay_usdt = round(usdt_amount::numeric, 6)
where pay_usdt is null;

do $$
declare
  grp record;
  row_id uuid;
  candidate numeric;
  taken numeric[];
begin
  for grp in
    select chain_id, lower(treasury_address) as treasury
    from public.payment_intents
    where status = 'awaiting_payment'
    group by 1, 2
  loop
    taken := array[]::numeric[];
    for row_id, candidate in
      select p.id, p.pay_usdt
      from public.payment_intents p
      where p.status = 'awaiting_payment'
        and p.chain_id = grp.chain_id
        and lower(p.treasury_address) = grp.treasury
      order by p.created_at, p.id
    loop
      while candidate = any (taken) loop
        candidate := candidate + 0.000001;
      end loop;
      taken := array_append(taken, candidate);
      update public.payment_intents
      set pay_usdt = candidate
      where id = row_id;
    end loop;
  end loop;
end $$;

alter table public.payment_intents
  alter column pay_usdt set not null;

alter table public.payment_intents
  drop constraint if exists payment_intents_pay_usdt_positive;

alter table public.payment_intents
  add constraint payment_intents_pay_usdt_positive
  check (pay_usdt > 0);

comment on column public.payment_intents.pay_usdt is
  'Exact USDT the payer must send. Unique among awaiting_payment on the same chain+treasury so deposits do not collide.';

comment on column public.payment_intents.usdt_amount is
  'Quoted commercial USDT. Fee and net local are computed from this, not from pay_usdt dust.';

drop index if exists public.payment_intents_open_pay_usdt_idx;

create unique index payment_intents_open_pay_usdt_idx
on public.payment_intents (chain_id, lower(treasury_address), pay_usdt)
where status = 'awaiting_payment';
