-- ============================================================
-- MIGRAÇÃO 014: Coluna destaque_ate + função de expiração
-- Destaque de anúncio: R$ 29,90 por 7 dias
-- ============================================================

-- 1. Coluna destaque_ate (quando o destaque expira)
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS destaque_ate timestamptz;

-- Índice para o cron de expiração
CREATE INDEX IF NOT EXISTS idx_veiculos_destaque_ate
  ON veiculos(destaque_ate)
  WHERE destaque = true;

-- 2. Função de expiração (chamada por cron ou Edge Function)
CREATE OR REPLACE FUNCTION expirar_destaques()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE veiculos
  SET destaque = false, destaque_ate = NULL
  WHERE destaque = true
    AND destaque_ate IS NOT NULL
    AND destaque_ate < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 3. Tabela de controle de destaques usados por garagem (plano inclui X/mês)
CREATE TABLE IF NOT EXISTS public.destaques_garagem (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  garagem_id uuid NOT NULL REFERENCES public.garagens(id) ON DELETE CASCADE,
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  origem text NOT NULL CHECK (origem IN ('plano', 'avulso')),
  stripe_payment_id text,
  expira_em timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_destaques_garagem_mes
  ON destaques_garagem(garagem_id, created_at DESC);

ALTER TABLE public.destaques_garagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Garagem vê seus destaques"
  ON destaques_garagem FOR SELECT USING (
    garagem_id IN (SELECT garagem_id FROM profiles WHERE id = auth.uid())
  );

-- Anunciante particular também pode ver seus destaques
CREATE POLICY "Anunciante vê destaques dos seus veículos"
  ON destaques_garagem FOR SELECT USING (
    veiculo_id IN (SELECT id FROM veiculos WHERE anunciante_id = auth.uid())
  );

CREATE POLICY "Sistema insere destaques"
  ON destaques_garagem FOR INSERT WITH CHECK (true);
