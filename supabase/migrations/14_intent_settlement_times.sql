-- Stamp settlement milestones with clock_timestamp() (microsecond precision)
-- now() is transaction-start time and would collapse fast detect -> credit -> payout
-- into one instant

alter table public.payment_intents
  add column if not exists detected_at timestamptz,
  add column if not exists credited_at timestamptz,
  add column if not exists payout_started_at timestamptz,
  add column if not exists paid_at timestamptz;

create or replace function public.stamp_intent_settlement_times()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'detected' then
    if new.detected_at is null then
      new.detected_at = clock_timestamp();
    end if;
  elsif new.status = 'credited' then
    if new.detected_at is null then
      new.detected_at = clock_timestamp();
    end if;
    if new.credited_at is null then
      new.credited_at = clock_timestamp();
    end if;
  elsif new.status = 'payout_pending' then
    if new.credited_at is null then
      new.credited_at = clock_timestamp();
    end if;
    if new.payout_started_at is null then
      new.payout_started_at = clock_timestamp();
    end if;
  elsif new.status = 'paid' then
    if new.payout_started_at is null then
      new.payout_started_at = clock_timestamp();
    end if;
    if new.paid_at is null then
      new.paid_at = clock_timestamp();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists payment_intents_stamp_settlement_times on public.payment_intents;

create trigger payment_intents_stamp_settlement_times
before insert or update of status on public.payment_intents
for each row
execute function public.stamp_intent_settlement_times();
