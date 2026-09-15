-- Index checkout links by creator for user-owned pay link lists
create index if not exists checkout_links_created_by_idx
on public.checkout_links (created_by, created_at desc);
