-- KAIROS 11.1.0 - Estensione profilo. Eseguire prima di pubblicare i nuovi file.
BEGIN;
ALTER TABLE public.tesserini
  ADD COLUMN IF NOT EXISTS data_nascita date,
  ADD COLUMN IF NOT EXISTS data_arruolamento date,
  ADD COLUMN IF NOT EXISTS ente_appartenenza text;
ALTER TABLE public.tesserini ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tesserini DROP CONSTRAINT IF EXISTS kairos_profilo_date111;
ALTER TABLE public.tesserini ADD CONSTRAINT kairos_profilo_date111 CHECK (
  (data_nascita IS NULL OR (data_nascita >= DATE '1900-01-01' AND data_nascita <= CURRENT_DATE)) AND
  (data_arruolamento IS NULL OR (data_arruolamento >= DATE '1900-01-01' AND data_arruolamento <= CURRENT_DATE)) AND
  (data_nascita IS NULL OR data_arruolamento IS NULL OR data_arruolamento >= data_nascita)
);
ALTER TABLE public.tesserini DROP CONSTRAINT IF EXISTS kairos_profilo_ente111;
ALTER TABLE public.tesserini ADD CONSTRAINT kairos_profilo_ente111 CHECK (
  ente_appartenenza IS NULL OR (length(trim(ente_appartenenza)) BETWEEN 1 AND 200 AND ente_appartenenza !~ '[[:cntrl:]]')
);
-- I privilegi di tabella e le policy RLS esistenti rimangono invariati.
NOTIFY pgrst, 'reload schema';
COMMIT;
