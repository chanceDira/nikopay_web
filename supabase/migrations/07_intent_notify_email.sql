-- Optional email for immediate MoMo success notifications.
alter table public.payment_intents
  add column if not exists notify_email text,
  add column if not exists paid_notified_at timestamptz;

comment on column public.payment_intents.notify_email is
  'Optional email for payout success notification';

comment on column public.payment_intents.paid_notified_at is
  'When the paid email was sent; null until notified';
