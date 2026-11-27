-- KAIROS 9.0.0 Chronos. Execute once in Supabase SQL Editor after backup.
-- Records only changes committed after installation, not earlier history.
begin;
create schema if not exists kairos_chronos_private;
revoke all on schema kairos_chronos_private from public, anon, authenticated;
create table if not exists public.kairos_history900 (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 profile_id uuid references public.tesserini(id) on delete cascade,
 changed_at timestamptz not null default statement_timestamp(),
 kind text not null check(kind in ('document','day','event','task','spettanze','models','preferences')),
 item_key text not null,
 before_value jsonb,
 after_value jsonb,
 check (before_value is distinct from after_value)
);
alter table public.kairos_history900 enable row level security;
revoke all on public.kairos_history900 from public, anon, authenticated;
grant select, delete on public.kairos_history900 to authenticated;
drop policy if exists chronos_read_own on public.kairos_history900;
create policy chronos_read_own on public.kairos_history900 for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists chronos_delete_own on public.kairos_history900;
create policy chronos_delete_own on public.kairos_history900 for delete to authenticated using ((select auth.uid())=user_id);
create index if not exists chronos_history_owner_idx on public.kairos_history900(user_id, changed_at desc, id desc);
create index if not exists chronos_history_profile_idx on public.kairos_history900(profile_id);
-- Convert a JSON array of named objects to an ID-indexed object.
create or replace function kairos_chronos_private.by_id(v jsonb) returns jsonb language sql immutable set search_path = '' as $$
 select coalesce(jsonb_object_agg(e->>'id',e),'{}'::jsonb)
 from jsonb_array_elements(case when jsonb_typeof(v)='array' then v else '[]'::jsonb end) e
 where jsonb_typeof(e)='object' and coalesce(e->>'id','')<>'';
$$;
revoke all on function kairos_chronos_private.by_id(jsonb) from public, anon, authenticated;
create or replace function kairos_chronos_private.diff(u uuid,p uuid,k text,b jsonb,a jsonb) returns void language sql set search_path = '' as $$
 insert into public.kairos_history900(user_id,profile_id,kind,item_key,before_value,after_value)
 select u,p,k,coalesce(x.key,y.key),x.value,y.value
 from jsonb_each(case when jsonb_typeof(b)='object' then b else '{}'::jsonb end) x
 full join jsonb_each(case when jsonb_typeof(a)='object' then a else '{}'::jsonb end) y on x.key=y.key
 where x.value is distinct from y.value;
$$;
revoke all on function kairos_chronos_private.diff(uuid,uuid,text,jsonb,jsonb) from public, anon, authenticated;
-- Private trigger, not a callable API. Only the authenticated owner is logged.
create or replace function kairos_chronos_private.capture() returns trigger language plpgsql security definer set search_path = '' as $$
declare u uuid; p uuid; b jsonb; a jsonb;
begin
 u := new.user_id;
 if auth.uid() is distinct from u or u is null then return new; end if;
 if tg_op='UPDATE' and old.user_id is distinct from u then return new; end if;
 if tg_table_schema <> 'public' then return new; end if;
 if tg_table_name='tesserini' then
  p:=new.id; a:=new.attestati;
  if tg_op='UPDATE' then b:=old.attestati; end if;
  perform kairos_chronos_private.diff(u,p,'document',kairos_chronos_private.by_id(b),kairos_chronos_private.by_id(a));
 elsif tg_table_name='kairos_shiftflow' then
  p:=new.profile_id; a:=new.state;
  if tg_op='UPDATE' then b:=old.state; end if;
  perform kairos_chronos_private.diff(u,p,'day',b->'days',a->'days');
  perform kairos_chronos_private.diff(u,p,'event',kairos_chronos_private.by_id(b#>'{planner,events}'),kairos_chronos_private.by_id(a#>'{planner,events}'));
  perform kairos_chronos_private.diff(u,p,'task',kairos_chronos_private.by_id(b#>'{planner,tasks}'),kairos_chronos_private.by_id(a#>'{planner,tasks}'));
  perform kairos_chronos_private.diff(u,p,'models',kairos_chronos_private.by_id(b->'shifts'),kairos_chronos_private.by_id(a->'shifts'));
  perform kairos_chronos_private.diff(u,p,'spettanze',jsonb_build_object('config',b->'spettanze'),jsonb_build_object('config',a->'spettanze'));
 elsif tg_table_name='kairos_preferences800' then
  a:=new.prefs; if tg_op='UPDATE' then b:=old.prefs; end if;
  perform kairos_chronos_private.diff(u,null,'preferences',b,a);
 end if;
 return new;
end; $$;
revoke all on function kairos_chronos_private.capture() from public, anon, authenticated;
drop trigger if exists chronos_documents900 on public.tesserini;
create trigger chronos_documents900 after insert or update of attestati on public.tesserini for each row execute function kairos_chronos_private.capture();
drop trigger if exists chronos_shift900 on public.kairos_shiftflow;
create trigger chronos_shift900 after insert or update of state on public.kairos_shiftflow for each row execute function kairos_chronos_private.capture();
-- Olympus table is expected on installations with Cloud Sync. Keep optional.
do $$ begin
 if to_regclass('public.kairos_preferences800') is not null then
  alter table public.kairos_preferences800 drop constraint if exists kairos_preferences800_keys;
  alter table public.kairos_preferences800 add constraint kairos_preferences800_keys check ((prefs - array['theme','motionChoice','hapticChoice','gestureChoice','homeSections582','homeActivitiesPref590','homePlannerPref512','ultimateOrder6','ultimateMode6','adaptive660','adaptiveProfiles660','calendarView670','infinity700','pdfPrefs800','resume800','chronosFavorites900']::text[])='{}'::jsonb);
  drop trigger if exists chronos_preferences900 on public.kairos_preferences800;
  create trigger chronos_preferences900 after insert or update of prefs on public.kairos_preferences800 for each row execute function kairos_chronos_private.capture();
 end if;
end $$;
commit;
notify pgrst, 'reload schema';
