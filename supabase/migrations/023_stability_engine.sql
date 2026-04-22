-- ============================================================
-- VenStudio V2: Stability AI engine fields
-- ============================================================

ALTER TABLE processamentos_ia
  ADD COLUMN IF NOT EXISTS engine_used text DEFAULT 'stability',
  ADD COLUMN IF NOT EXISTS generation_id text,
  ADD COLUMN IF NOT EXISTS light_direction text,
  ADD COLUMN IF NOT EXISTS light_strength numeric(3,2),
  ADD COLUMN IF NOT EXISTS preserve_subject numeric(3,2),
  ADD COLUMN IF NOT EXISTS hamming_distance integer;

-- Garantir coluna status existe com check correto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processamentos_ia' AND column_name = 'status'
  ) THEN
    ALTER TABLE processamentos_ia ADD COLUMN status text DEFAULT 'pendente';
  END IF;
END $$;

-- Index para polling por status
CREATE INDEX IF NOT EXISTS idx_processamentos_status
  ON processamentos_ia(status, created_at DESC);

-- Index para lookup por generation_id
CREATE INDEX IF NOT EXISTS idx_processamentos_generation_id
  ON processamentos_ia(generation_id)
  WHERE generation_id IS NOT NULL;
