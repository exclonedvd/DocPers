-- Aggiornamento non distruttivo del database DocPers v2. Eseguire come postgres.
begin;
alter table public.tesserini add column if not exists attestati jsonb;
update public.tesserini t set attestati = (select jsonb_agg(jsonb_build_object('id',v.id,'nome',v.nome,'data',v.data,'anni',v.anni,'scadenza',null) order by v.ordine) from (values
(1,'idoneita','Idoneità sanitaria',t.idoneita,1), (2,'prove_fisiche','Prove fisiche SMA-ORD 034',t.prove_fisiche,1), (3,'iccs','I.C.C.S.',t.iccs,1), (4,'combat','Combat Readiness',t.combat,1), (5,'poligono_dinamico','Poligono dinamico',t.poligono_dinamico,1), (6,'poligono_statico','Poligono statico',t.poligono_statico,1), (7,'corso_lavoratore','Corso lavoratore',t.corso_lavoratore,5)) v(ordine,id,nome,data,anni)) where attestati is null;
alter table public.tesserini alter column attestati set default '[]'::jsonb;
alter table public.tesserini alter column attestati set not null;
-- I campi v2 sono conservati come copia storica, non vengono più aggiornati dalla v3.
create table if not exists public.docpers_push (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 endpoint text not null check (length(endpoint) between 1 and 4096),
 p256dh text not null check (length(p256dh) between 1 and 256),
 auth text not null check (length(auth) between 1 and 256),
 last_sent date,
 primary key(user_id, endpoint)
);
alter table public.docpers_push enable row level security;
revoke all on public.docpers_push from public, anon, authenticated;
grant select, insert, update, delete on public.docpers_push to authenticated;
grant select, update, delete on public.docpers_push to service_role;
grant select on public.tesserini to service_role;
drop policy if exists push_owner on public.docpers_push;
create policy push_owner on public.docpers_push for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
commit;
