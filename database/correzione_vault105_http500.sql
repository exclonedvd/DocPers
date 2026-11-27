-- KAIROS 10.6.1 ATHENA - Correzione HTTP 500
-- Solo per installazioni con la migrazione PROMETHEUS 10.5.0 gia eseguita.
-- Mantiene le policy di lettura, eliminazione e divieto di sovrascrittura.
-- Ripetibile; non modifica file, bucket o dati.
BEGIN;

ALTER POLICY vault105_insert ON storage.objects WITH CHECK (
 bucket_id='kairos-vault105' and (storage.foldername(name))[1]=(select auth.uid())::text
 and array_length(storage.foldername(name),1)=3 and length((storage.foldername(name))[3]) between 2 and 512 and (storage.foldername(name))[3] ~ '^[0-9a-f]+$'
 and storage.filename(name) ~ '^[0-9a-f-]{36}_[a-zA-Z0-9._-]+[.](pdf|jpg|png|webp)$'
 and exists(select 1 from public.tesserini t where t.id::text=(storage.foldername(name))[2] and t.user_id=(select auth.uid())));

ALTER POLICY vault105_owner_guard ON storage.objects WITH CHECK (bucket_id <> 'kairos-vault105' or ((storage.foldername(name))[1]=(select auth.uid())::text
 and array_length(storage.foldername(name),1)=3 and length((storage.foldername(name))[3]) between 2 and 512 and (storage.foldername(name))[3] ~ '^[0-9a-f]+$'
 and storage.filename(name) ~ '^[0-9a-f-]{36}_[a-zA-Z0-9._-]+[.](pdf|jpg|png|webp)$'
 and exists(select 1 from public.tesserini t where t.id::text=(storage.foldername(name))[2] and t.user_id=(select auth.uid()))));

COMMIT;
