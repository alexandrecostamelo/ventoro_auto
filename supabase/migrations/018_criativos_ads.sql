-- ============================================================
-- MIGRAÇÃO 018: Criativos para Tráfego Pago
-- Armazena criativos gerados (copy + segmentação) por veículo
-- ============================================================

CREATE TABLE IF NOT EXISTS public.criativos_ads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  garagem_id uuid REFERENCES public.garagens(id) ON DELETE SET NULL,
  anunciante_id uuid NOT NULL REFERENCES auth.users(id),
  -- Formato do criativo
  formato text NOT NULL CHECK (formato IN ('feed', 'stories', 'google_display')),
  -- Copy gerada pela IA
  copy_primaria text NOT NULL,
  copy_secundaria text NOT NULL,
  cta text NOT NULL DEFAULT 'Saiba mais',
  -- Segmentação sugerida
  segmentacao jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Dados do veículo snapshot (para reconstruir criativo sem re-query)
  veiculo_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- URL da foto usada
  foto_url text,
  -- Metadados
  modelo_ia text NOT NULL DEFAULT 'claude-sonnet-4-20250514'
);

CREATE INDEX IF NOT EXISTS idx_criativos_ads_veiculo
  ON criativos_ads(veiculo_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_criativos_ads_garagem
  ON criativos_ads(garagem_id, created_at DESC);

ALTER TABLE public.criativos_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono vê seus criativos"
  ON criativos_ads FOR SELECT
  USING (anunciante_id = auth.uid());

CREATE POLICY "Sistema gerencia criativos"
  ON criativos_ads FOR ALL
  USING (true) WITH CHECK (true);
