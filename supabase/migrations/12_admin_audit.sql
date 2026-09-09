-- Admin actions on intents and enqueued payouts.

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null
    check (action in ('intent_status', 'fail_enqueued')),
  intent_id uuid references public.payment_intents (id) on delete set null,
  payout_id uuid,
  from_status text,
  to_status text,
  detail text,
  created_at timestamptz not null default timezone('utc', now())
);

create index admin_audit_log_intent_idx
on public.admin_audit_log (intent_id, created_at desc);

alter table public.admin_audit_log enable row level security;

create policy admin_audit_log_select_admin
on public.admin_audit_log
for select
to authenticated
using (public.is_admin());
