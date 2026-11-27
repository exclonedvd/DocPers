-- KAIROS 10.7.0: controllo in sola lettura, non cambia alcun dato.
-- Tutte le tabelle elencate devono essere presenti e avere RLS attiva.
with expected(name) as (values ('tesserini'),('kairos_shiftflow'),('kairos_preferences800'),('kairos_renewal_history'),('kairos_inbox'),('kairos_history900'),('kairos_missions105'),('docpers_push'))
select e.name as tabella, c.oid is not null as presente, coalesce(c.relrowsecurity,false) as rls_attiva
from expected e left join pg_namespace n on n.nspname='public' left join pg_class c on c.relnamespace=n.oid and c.relname=e.name order by e.name;
-- Controllare che ogni policy permissiva limiti l'accesso al proprietario.
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies
where (schemaname='public' and tablename in ('tesserini','kairos_shiftflow','kairos_preferences800','kairos_renewal_history','kairos_inbox','kairos_history900','kairos_missions105','docpers_push')) or (schemaname='storage' and tablename='objects') order by schemaname,tablename,policyname;
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='kairos-vault105';
-- Devono essere presenti le policy vault105_read, insert, delete, owner_guard, no_update.
-- Non basta un controllo delle definizioni: provare due account reali distinti prima di aprire le registrazioni al pubblico.
