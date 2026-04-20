-- ============================================================
-- MIGRAÇÃO 016: Cache de consultas FIPE
-- Armazena resultados FIPE por 30 dias para evitar chamadas repetidas
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cache_fipe (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  -- Chave de busca (normalizada lowercase)
  marca text NOT NULL,
  modelo text NOT NULL,
  ano integer NOT NULL,
  combustivel text NOT NULL DEFAULT 'flex',
  -- Resultado FIPE
  codigo_fipe text,
  preco_fipe numeric(12,2) NOT NULL,
  referencia_mes text,          -- ex: "abril de 2026"
  -- Faixa sugerida (FIPE ± ajuste)
  preco_sugerido_min numeric(12,2) NOT NULL,
  preco_sugerido_max numeric(12,2) NOT NULL,
  -- Dados brutos da API (para debug)
  dados_api jsonb,
  -- Expiração
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

-- Index único para lookup + upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_fipe_lookup
  ON cache_fipe(marca, modelo, ano, combustivel);

-- Index para limpeza de cache expirado
CREATE INDEX IF NOT EXISTS idx_cache_fipe_expira
  ON cache_fipe(expira_em);

-- RLS: leitura pública (é dado FIPE, não sensível), insert/update por service_role
ALTER TABLE public.cache_fipe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache FIPE é público para leitura"
  ON cache_fipe FOR SELECT USING (true);

CREATE POLICY "Sistema gerencia cache FIPE"
  ON cache_fipe FOR ALL USING (true) WITH CHECK (true);

-- Função para limpar cache expirado (chamada por cron opcional)
CREATE OR REPLACE FUNCTION limpar_cache_fipe_expirado()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM cache_fipe WHERE expira_em < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
