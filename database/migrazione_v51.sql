-- Kairos 5.1: eseguire una volta come postgres nel SQL Editor.
-- Non modifica le schede, le chiavi VAPID, il Cron o la Edge Function esistenti.
begin;
create schema if not exists kairos_private;
revoke all on schema kairos_private from public, anon, authenticated;
create table if not exists public.kairos_renewal_history (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 person_id uuid not null references public.tesserini(id) on delete cascade,
 doc_id text not null,
 previous_doc jsonb not null,
 changed_at timestamptz not null default now()
);
create index if not exists kairos_history_owner_idx on public.kairos_renewal_history(user_id,person_id,doc_id,changed_at desc);
create table if not exists public.kairos_inbox (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 person_id uuid not null references public.tesserini(id) on delete cascade,
 doc_id text not null,
 doc_name text not null,
 expiry_date date not null,
 reminder_date date not null,
 days_remaining integer not null check (days_remaining in (0,1,7,15,30)),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(user_id,person_id,doc_id,expiry_date,reminder_date)
);
create index if not exists kairos_inbox_owner_idx on public.kairos_inbox(user_id,created_at desc);
alter table public.kairos_renewal_history enable row level security;
alter table public.kairos_inbox enable row level security;
revoke all on public.kairos_renewal_history, public.kairos_inbox from public, anon, authenticated;
grant select on public.kairos_renewal_history, public.kairos_inbox to authenticated;
grant update(read_at) on public.kairos_inbox to authenticated;
drop policy if exists kairos_history_read on public.kairos_renewal_history;
create policy kairos_history_read on public.kairos_renewal_history for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists kairos_inbox_read on public.kairos_inbox;
create policy kairos_inbox_read on public.kairos_inbox for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists kairos_inbox_mark on public.kairos_inbox;
create policy kairos_inbox_mark on public.kairos_inbox for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
-- Le funzioni trigger sono in schema non esposto, senza autorizzazione di chiamata pubblica.
create or replace function kairos_private.doc_expiry(d jsonb) returns date
language plpgsql immutable set search_path = '' as $$
declare s date; n integer; y integer;
begin
 if coalesce(d->>'data','') !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
 s := (d->>'data')::date;
 if coalesce(d->>'scadenza','') <> '' then
   if (d->>'scadenza') !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
   return (d->>'scadenza')::date;
 end if;
 n := (d->>'anni')::integer;
 if n is null or n<1 or n>100 then return null; end if;
 y := extract(year from s)::integer+n;
 -- Stessa semantica JavaScript setUTCFullYear, incluso 29 febbraio.
 return make_date(y,extract(month from s)::integer,1)+extract(day from s)::integer-2;
exception when others then return null;
end; $$;
create or replace function kairos_private.save_history() returns trigger
language plpgsql security definer set search_path = '' as $$
declare d jsonb; nd jsonb;
begin
 if old.user_id is distinct from new.user_id then return new; end if;
 if jsonb_typeof(old.attestati) is distinct from 'array' or jsonb_typeof(new.attestati) is distinct from 'array' then return new; end if;
 for d in select value from jsonb_array_elements(old.attestati) loop
   if coalesce(d->>'id','')='' or kairos_private.doc_expiry(d) is null then continue; end if;
   select value into nd from jsonb_array_elements(new.attestati) where value->>'id'=d->>'id' limit 1;
   if nd is not null and (d->>'data',d->>'scadenza',d->>'anni') is distinct from (nd->>'data',nd->>'scadenza',nd->>'anni') then
     insert into public.kairos_renewal_history(user_id,person_id,doc_id,previous_doc) values(old.user_id,old.id,d->>'id',d);
   end if;
 end loop;
 return new;
end; $$;
create or replace function kairos_private.log_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if new.last_sent is null or new.last_sent is not distinct from old.last_sent or old.user_id is distinct from new.user_id then return new; end if;
 -- Il client non genera lo storico delle notifiche: solo il servizio server.
 if coalesce(auth.jwt()->>'role','') <> 'service_role' then return new; end if;
 insert into public.kairos_inbox(user_id,person_id,doc_id,doc_name,expiry_date,reminder_date,days_remaining)
 select t.user_id,t.id,d.value->>'id',coalesce(d.value->>'nome','Attestato'),e.expiry,new.last_sent,e.expiry-new.last_sent
 from public.tesserini t
 cross join lateral jsonb_array_elements(case when jsonb_typeof(t.attestati)='array' then t.attestati else '[]'::jsonb end) d
 cross join lateral (select kairos_private.doc_expiry(d.value) as expiry) e
 where t.user_id=new.user_id and coalesce(d.value->>'id','')<>'' and e.expiry-new.last_sent in (0,1,7,15,30)
 on conflict(user_id,person_id,doc_id,expiry_date,reminder_date) do nothing;
 return new;
end; $$;
revoke all on function kairos_private.doc_expiry(jsonb), kairos_private.save_history(), kairos_private.log_reminders() from public, anon, authenticated;
drop trigger if exists kairos_history_trigger on public.tesserini;
create trigger kairos_history_trigger after update of attestati on public.tesserini for each row when (old.attestati is distinct from new.attestati) execute function kairos_private.save_history();
drop trigger if exists kairos_inbox_trigger on public.docpers_push;
create trigger kairos_inbox_trigger after update of last_sent on public.docpers_push for each row when (old.last_sent is distinct from new.last_sent) execute function kairos_private.log_reminders();
commit;
