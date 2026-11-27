-- KAIROS 10.5.0 PROMETHEUS / ATHENA 10.6.1 SQL Fix. Eseguire nel SQL Editor del proprio progetto
-- prima di utilizzare Missioni e Allegati. Non modifica tesserini o preferenze.
-- Correzione HTTP 500: lunghezza separata dal controllo esadecimale.
begin;
create table if not exists public.kairos_missions105 (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 profile_id uuid not null references public.tesserini(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 100),
 location text not null default '' check (length(location)<=100),
 start_date date not null,
 end_date date not null check (end_date>=start_date),
 note text not null default '' check (length(note)<=500)
);
create index if not exists kairos_missions105_owner_idx on public.kairos_missions105(user_id,profile_id,start_date);
alter table public.kairos_missions105 enable row level security;
revoke all on public.kairos_missions105 from public, anon, authenticated;
grant select, delete on public.kairos_missions105 to authenticated;
grant insert (user_id,profile_id,title,location,start_date,end_date,note), update (title,location,start_date,end_date,note) on public.kairos_missions105 to authenticated;
drop policy if exists missions105_own on public.kairos_missions105;
create policy missions105_own on public.kairos_missions105 for all to authenticated
 using (user_id=(select auth.uid()) and exists(select 1 from public.tesserini t where t.id=profile_id and t.user_id=(select auth.uid())))
 with check (user_id=(select auth.uid()) and exists(select 1 from public.tesserini t where t.id=profile_id and t.user_id=(select auth.uid())));
-- Private bucket. No anonymous/public URLs. No update/upsert policy.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('kairos-vault105','kairos-vault105',false,2097152,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists vault105_read on storage.objects;
drop policy if exists vault105_insert on storage.objects;
drop policy if exists vault105_delete on storage.objects;
create policy vault105_read on storage.objects for select to authenticated using (
 bucket_id='kairos-vault105' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.tesserini t where t.id::text=(storage.foldername(name))[2] and t.user_id=(select auth.uid())));
create policy vault105_insert on storage.objects for insert to authenticated with check (
 bucket_id='kairos-vault105' and (storage.foldername(name))[1]=(select auth.uid())::text
 and array_length(storage.foldername(name),1)=3 and length((storage.foldername(name))[3]) between 2 and 512 and (storage.foldername(name))[3] ~ '^[0-9a-f]+$'
 and storage.filename(name) ~ '^[0-9a-f-]{36}_[a-zA-Z0-9._-]+[.](pdf|jpg|png|webp)$'
 and exists(select 1 from public.tesserini t where t.id::text=(storage.foldername(name))[2] and t.user_id=(select auth.uid())));
create policy vault105_delete on storage.objects for delete to authenticated using (
 bucket_id='kairos-vault105' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.tesserini t where t.id::text=(storage.foldername(name))[2] and t.user_id=(select auth.uid())));
-- Guard against overly broad pre-existing permissive Storage policies.
drop policy if exists vault105_owner_guard on storage.objects;
create policy vault105_owner_guard on storage.objects as restrictive for all to public
 using (bucket_id <> 'kairos-vault105' or ((storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.tesserini t where t.id::text=(storage.foldername(name))[2] and t.user_id=(select auth.uid()))))
 with check (bucket_id <> 'kairos-vault105' or ((storage.foldername(name))[1]=(select auth.uid())::text
 and array_length(storage.foldername(name),1)=3 and length((storage.foldername(name))[3]) between 2 and 512 and (storage.foldername(name))[3] ~ '^[0-9a-f]+$'
 and storage.filename(name) ~ '^[0-9a-f-]{36}_[a-zA-Z0-9._-]+[.](pdf|jpg|png|webp)$'
 and exists(select 1 from public.tesserini t where t.id::text=(storage.foldername(name))[2] and t.user_id=(select auth.uid()))));
drop policy if exists vault105_no_update on storage.objects;
create policy vault105_no_update on storage.objects as restrictive for update to public
 using (bucket_id <> 'kairos-vault105') with check (bucket_id <> 'kairos-vault105');
commit;
-- Verifica manuale: due account distinti; provare SELECT/INSERT/DELETE incrociati
-- tramite API autenticata. Controllare anche eventuali policy Storage preesistenti
-- troppo permissive: le policy permissive si combinano con OR.
