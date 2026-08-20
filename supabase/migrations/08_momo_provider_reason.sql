-- Persist MTN failure reasons and track failure notification sends.
alter table public.momo_transfers
  add column if not exists provider_reason text;

alter table public.payment_intents
  add column if not exists failed_notified_at timestamptz;

comment on column public.momo_transfers.provider_reason is
  'MTN reason/reasonCode when status is failed or timeout';

comment on column public.payment_intents.failed_notified_at is
  'When the confirmed MoMo failure email was sent';
