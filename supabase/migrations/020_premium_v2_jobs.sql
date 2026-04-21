-- ============================================================
-- VenStudio Premium V2 — Colunas para jobs assíncronos
-- Adiciona campos ao processamentos_ia para suportar:
--   - pipeline async com webhook
--   - tracking de prediction do Replicate
--   - retry controlado
--   - status granular
-- ============================================================

-- Status do job: processando → concluido/erro/rejeitado/fallback_elegivel
ALTER TABLE processamentos_ia
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'processando';

-- ID da prediction no Replicate (para correlação no webhook)
ALTER TABLE processamentos_ia
  ADD COLUMN IF NOT EXISTS replicate_prediction_id text;

-- Preset visual usado (luxury_showroom, premium_studio, etc.)
ALTER TABLE processamentos_ia
  ADD COLUMN IF NOT EXISTS preset_id text;

-- Prompt completo enviado ao modelo (para auditoria)
ALTER TABLE processamentos_ia
  ADD COLUMN IF NOT EXISTS prompt_usado text;

-- Caminhos no storage (para reprocessamento/debug)
ALTER TABLE processamentos_ia
  ADD COLUMN IF NOT EXISTS input_path text;
ALTER TABLE processamentos_ia
  ADD COLUMN IF NOT EXISTS mask_path text;

-- Contador de tentativas (retry até 3)
ALTER TABLE processamentos_ia
  ADD COLUMN IF NOT EXISTS tentativas integer DEFAULT 0;

-- Flag para fallback elegível (após 3 falhas)
ALTER TABLE processamentos_ia
  ADD COLUMN IF NOT EXISTS fallback_elegivel boolean DEFAULT false;

-- Timestamp de atualização
ALTER TABLE processamentos_ia
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Índice para busca por prediction_id (webhook lookup)
CREATE INDEX IF NOT EXISTS idx_processamentos_ia_prediction
  ON processamentos_ia (replicate_prediction_id)
  WHERE replicate_prediction_id IS NOT NULL;

-- Índice para busca por status (polling/realtime)
CREATE INDEX IF NOT EXISTS idx_processamentos_ia_status
  ON processamentos_ia (status, updated_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_processamentos_ia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_processamentos_ia_updated_at ON processamentos_ia;
CREATE TRIGGER trg_processamentos_ia_updated_at
  BEFORE UPDATE ON processamentos_ia
  FOR EACH ROW
  EXECUTE FUNCTION update_processamentos_ia_updated_at();

-- Habilitar Realtime para a tabela (frontend escuta mudanças)
ALTER PUBLICATION supabase_realtime ADD TABLE processamentos_ia;
