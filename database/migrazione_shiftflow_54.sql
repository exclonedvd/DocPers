-- Kairos 5.4: modulo ShiftFlow. Eseguire una sola volta prima della pubblicazione.
-- Nessun cambiamento alle tabelle degli attestati, alle notifiche o alle sessioni.
begin;
create table if not exists public.kairos_shiftflow (
 profile_id uuid primary key references public.tesserini(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 state jsonb not null check (jsonb_typeof(state) = 'object' and state->>'version' = '1' and jsonb_typeof(state->'shifts') = 'array' and jsonb_typeof(state->'days') = 'object' and octet_length(state::text) <= 3000000),
 revision integer not null default 1 check (revision >= 1)
);
alter table public.kairos_shiftflow enable row level security;
revoke all on public.kairos_shiftflow from public, anon, authenticated;
grant select on public.kairos_shiftflow to authenticated;
grant insert (profile_id,user_id,state,revision), update (state,revision) on public.kairos_shiftflow to authenticated;
drop policy if exists shiftflow_own_select on public.kairos_shiftflow;
create policy shiftflow_own_select on public.kairos_shiftflow for select to authenticated using (
 user_id=(select auth.uid()) and exists(select 1 from public.tesserini t where t.id=kairos_shiftflow.profile_id and t.user_id=(select auth.uid()))
);
drop policy if exists shiftflow_own_insert on public.kairos_shiftflow;
create policy shiftflow_own_insert on public.kairos_shiftflow for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(select 1 from public.tesserini t where t.id=kairos_shiftflow.profile_id and t.user_id=(select auth.uid()))
);
drop policy if exists shiftflow_own_update on public.kairos_shiftflow;
create policy shiftflow_own_update on public.kairos_shiftflow for update to authenticated using (
 user_id=(select auth.uid()) and exists(select 1 from public.tesserini t where t.id=kairos_shiftflow.profile_id and t.user_id=(select auth.uid()))
) with check (
 user_id=(select auth.uid()) and exists(select 1 from public.tesserini t where t.id=kairos_shiftflow.profile_id and t.user_id=(select auth.uid()))
);
commit;
