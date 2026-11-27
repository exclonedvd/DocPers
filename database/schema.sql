-- Eseguire una volta nel SQL Editor di un progetto Supabase dedicato.
begin;
create table public.tesserini (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  matricola text not null check (length(trim(matricola)) between 1 and 40),
  grado text not null check (length(trim(grado)) between 1 and 80),
  cognome text not null check (length(trim(cognome)) between 1 and 100),
  nome text not null check (length(trim(nome)) between 1 and 100),
  avatar_key text,
  idoneita date, prove_fisiche date, iccs date, combat date,
  poligono_dinamico date, poligono_statico date, corso_lavoratore date,
  created_at timestamptz not null default now()
);
create unique index tesserini_matricola_unique on public.tesserini(user_id, lower(trim(matricola)));
alter table public.tesserini enable row level security;
revoke all on public.tesserini from public, anon, authenticated;
grant select, insert, update, delete on public.tesserini to authenticated;
create policy lettura_propria on public.tesserini for select to authenticated using ((select auth.uid()) = user_id);
create policy inserimento_proprio on public.tesserini for insert to authenticated with check ((select auth.uid()) = user_id);
create policy modifica_propria on public.tesserini for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy eliminazione_propria on public.tesserini for delete to authenticated using ((select auth.uid()) = user_id);
commit;
