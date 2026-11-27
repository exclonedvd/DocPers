-- KAIROS 8.0.0 Olympus: optional preference-only sync. Run once in SQL Editor.
-- No alterations to existing tables, policies, auth, notifications or personal records.
begin;
create table if not exists public.kairos_preferences800 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 1 check (revision > 0),
  prefs jsonb not null check (jsonb_typeof(prefs) = 'object' and octet_length(prefs::text) <= 40000),
  constraint kairos_preferences800_keys check ((prefs - array['theme','motionChoice','hapticChoice','gestureChoice','homeSections582','homeActivitiesPref590','homePlannerPref512','ultimateOrder6','ultimateMode6','adaptive660','adaptiveProfiles660','calendarView670','infinity700','pdfPrefs800','resume800']::text[]) = '{}'::jsonb)
);
alter table public.kairos_preferences800 enable row level security;
revoke all on table public.kairos_preferences800 from public, anon, authenticated;
grant select, insert, update on table public.kairos_preferences800 to authenticated;
drop policy if exists kairos_preferences800_select on public.kairos_preferences800;
create policy kairos_preferences800_select on public.kairos_preferences800 for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists kairos_preferences800_insert on public.kairos_preferences800;
create policy kairos_preferences800_insert on public.kairos_preferences800 for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists kairos_preferences800_update on public.kairos_preferences800;
create policy kairos_preferences800_update on public.kairos_preferences800 for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
commit;
notify pgrst, 'reload schema';
