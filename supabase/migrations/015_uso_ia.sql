-- ============================================================
-- MIGRAÇÃO 015: Tabela uso_ia — controle de uso do VenStudio IA
-- Rastreia cada processamento de foto para controle de custo e rate limit
-- ============================================================

-- 1. Tabela principal de uso de IA
CREATE TABLE IF NOT EXISTS public.uso_ia (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL,
  foto_id uuid REFERENCES public.fotos_veiculo(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('venstudio', 'descricao_ia', 'outro')),
  cenario text,
  modelo_ia text,                -- ex: 'rmbg-2.0', 'gpt-image-1'
  custo_estimado numeric(6,4) DEFAULT 0, -- em BRL
  tempo_ms integer,              -- duração do processamento
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'erro')),
  erro_msg text
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_uso_ia_user_created
  ON uso_ia(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_uso_ia_user_dia
  ON uso_ia(user_id, created_at)
  WHERE tipo = 'venstudio' AND status = 'ok';

-- 2. RLS
ALTER TABLE public.uso_ia ENABLE ROW LEVEL SECURITY;

-- User vê seus próprios registros
CREATE POLICY "User vê seu uso de IA"
  ON uso_ia FOR SELECT USING (user_id = auth.uid());

-- Sistema insere (Edge Function com service_role)
CREATE POLICY "Sistema insere uso_ia"
  ON uso_ia FOR INSERT WITH CHECK (true);

-- 3. Função helper: contar uso diário (para rate limit na Edge Function)
CREATE OR REPLACE FUNCTION contar_uso_ia_hoje(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM uso_ia
  WHERE user_id = p_user_id
    AND tipo = 'venstudio'
    AND status = 'ok'
    AND created_at >= (now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamptz;
$$;

-- 4. Função helper: contar uso mensal (para controle de plano)
CREATE OR REPLACE FUNCTION contar_uso_ia_mes(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM uso_ia
  WHERE user_id = p_user_id
    AND tipo = 'venstudio'
    AND status = 'ok'
    AND created_at >= date_trunc('month', now());
$$;
