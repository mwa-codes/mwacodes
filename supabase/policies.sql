-- Run in Supabase → SQL Editor if you do NOT use SUPABASE_SERVICE_ROLE_KEY on the server.
-- Enables read/write/delete for the links table via SUPABASE_ANON_KEY.
-- If you use the service role for saves, you still need either this SELECT policy or
-- service role on GET — the app uses service role for all API routes when configured.

alter table public.links enable row level security;

drop policy if exists "links_select_anon" on public.links;
drop policy if exists "links_insert_anon" on public.links;
drop policy if exists "links_delete_anon" on public.links;

create policy "links_select_anon"
  on public.links
  for select
  to anon, authenticated
  using (true);

create policy "links_insert_anon"
  on public.links
  for insert
  to anon, authenticated
  with check (true);

create policy "links_delete_anon"
  on public.links
  for delete
  to anon, authenticated
  using (true);
