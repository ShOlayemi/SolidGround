create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email_to text not null,
  subject text not null,
  template_name text not null,
  sent_at timestamptz not null default now(),
  status text not null check (status in ('sent', 'failed')),
  error_message text
);
create index if not exists email_log_user_id_idx on public.email_log(user_id);
create index if not exists email_log_sent_at_idx on public.email_log(sent_at desc);
alter table public.email_log enable row level security;
create policy "Users can read own email log" on public.email_log for select using (auth.uid() = user_id);
create policy "Service role can insert email log" on public.email_log for insert with check (auth.role() = 'service_role');
