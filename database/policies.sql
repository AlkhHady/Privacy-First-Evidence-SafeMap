alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.evidence enable row level security;
alter table public.analyses enable row level security;
alter table public.safe_locations enable row level security;

create policy "users read own profile" on public.profiles
for select using (auth.uid() = id);

create policy "users update own profile" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "users manage own cases" on public.cases
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users read evidence from own cases" on public.evidence
for select using (
  exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid())
);

create policy "users read analyses from own cases" on public.analyses
for select using (
  exists (
    select 1 from public.evidence e
    join public.cases c on c.id = e.case_id
    where e.id = evidence_id and c.user_id = auth.uid()
  )
);

create policy "authenticated users read active safe locations" on public.safe_locations
for select to authenticated using (is_active = true);

-- Create the `evidence-private` bucket as private in the Supabase dashboard.
-- The backend service role owns upload/delete operations; never expose it to clients.
