-- Aggiornamento non distruttivo ReadyCheck v3.5: avatar per ogni scheda.
-- Eseguire nel SQL Editor del progetto Supabase già in uso.
begin;
alter table public.tesserini add column if not exists avatar_key text;
commit;
