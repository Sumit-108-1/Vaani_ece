-- Run this once in Supabase: SQL Editor > New query > Run
create table admins (user_id uuid primary key references auth.users on delete cascade);
create table materials (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('note','pyq')),
  sem int not null check (sem between 1 and 8),
  subject text not null,
  code text,
  title text not null,
  year int,
  file_path text not null,
  created_at timestamptz default now()
);
alter table admins enable row level security;
alter table materials enable row level security;

create policy "admin reads own row" on admins for select using (user_id = auth.uid());
create policy "anyone reads materials" on materials for select using (true);
create policy "admins manage materials" on materials for all
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

insert into storage.buckets (id, name, public) values ('files', 'files', true) on conflict do nothing;
create policy "admins manage files" on storage.objects for all
  using (bucket_id = 'files' and exists (select 1 from admins where user_id = auth.uid()))
  with check (bucket_id = 'files' and exists (select 1 from admins where user_id = auth.uid()));

-- After you log in once on the site, make yourself admin (use your email):
-- insert into admins select id from auth.users where email = 'you@example.com';
