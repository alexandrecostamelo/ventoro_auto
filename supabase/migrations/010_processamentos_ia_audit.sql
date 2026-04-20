-- Tabela de auditoria para processamentos VenStudio IA
-- Criada após incidente de pipeline generativo alterando veículos (2026-04)

CREATE TABLE IF NOT EXISTS public.processamentos_ia (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id uuid NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  foto_id uuid REFERENCES fotos_veiculo(id) ON DELETE CASCADE,
  foto_original_url text NOT NULL,
  foto_processada_url text,
  cenario text NOT NULL,
  pipeline_versao text NOT NULL,
  fingerprint_original text,
  fingerprint_processado text,
  fingerprint_match boolean,
  aprovado boolean DEFAULT false,
  custo_estimado numeric(10,4),
  tempo_processamento_ms integer,
  erro text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_processamentos_ia_veiculo ON processamentos_ia(veiculo_id);
CREATE INDEX idx_processamentos_ia_aprovado ON processamentos_ia(aprovado, created_at DESC);

ALTER TABLE processamentos_ia ENABLE ROW LEVEL SECURITY;

-- Anunciante vê próprios logs
CREATE POLICY "anunciante_ve_proprios_processamentos"
ON processamentos_ia FOR SELECT
USING (
  EXISTS (SELECT 1 FROM veiculos v
          WHERE v.id = processamentos_ia.veiculo_id
          AND v.anunciante_id = auth.uid())
);

-- INSERT apenas via service_role (Edge Function)
