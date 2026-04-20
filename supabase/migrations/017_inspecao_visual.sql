-- ============================================================
-- MIGRAÇÃO 017: Inspeção Visual com IA
-- Armazena resultados de inspeção visual de danos em veículos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inspecao_visual (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  anunciante_id uuid NOT NULL REFERENCES auth.users(id),
  -- Score geral de condição (0-100, 100 = perfeito)
  score_condicao integer NOT NULL CHECK (score_condicao BETWEEN 0 AND 100),
  -- Danos detectados (array de objetos)
  danos jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Resumo textual gerado pela IA
  resumo text,
  -- Fotos usadas na inspeção (URLs)
  fotos_inspecao jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Metadados
  modelo_ia text NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  tempo_ms integer,
  custo_estimado numeric(8,4) DEFAULT 0
);

-- Uma inspeção ativa por veículo (a mais recente vale)
CREATE INDEX IF NOT EXISTS idx_inspecao_visual_veiculo
  ON inspecao_visual(veiculo_id, created_at DESC);

-- RLS
ALTER TABLE public.inspecao_visual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono vê inspeções dos seus veículos"
  ON inspecao_visual FOR SELECT
  USING (anunciante_id = auth.uid());

CREATE POLICY "Público vê inspeções de veículos publicados"
  ON inspecao_visual FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM veiculos v
      WHERE v.id = inspecao_visual.veiculo_id
        AND v.status = 'publicado'
    )
  );

CREATE POLICY "Sistema gerencia inspeções"
  ON inspecao_visual FOR ALL
  USING (true) WITH CHECK (true);

-- Função para atualizar score_confianca e selo_inspecao do veículo
CREATE OR REPLACE FUNCTION atualizar_selo_inspecao(
  p_veiculo_id uuid,
  p_score_condicao integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE veiculos
  SET
    selo_inspecao = true,
    score_confianca = LEAST(100, score_confianca + 15)
  WHERE id = p_veiculo_id
    AND selo_inspecao = false;
END;
$$;
