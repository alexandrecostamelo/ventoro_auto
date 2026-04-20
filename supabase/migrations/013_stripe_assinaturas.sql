-- ============================================================
-- MIGRAÇÃO 013: Colunas Stripe em assinaturas + ajustes pagamentos
-- Prepara integração real com Stripe para planos de garagem
-- ============================================================

-- ============================================================
-- 1. COLUNAS EXTRAS em assinaturas
-- stripe_subscription_id já existe (001)
-- ============================================================
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS periodo_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS periodo_fim timestamptz,
  ADD COLUMN IF NOT EXISTS cancelada_em timestamptz;

-- Índice para lookup por stripe_customer_id (webhook usa isso)
CREATE INDEX IF NOT EXISTS idx_assinaturas_stripe_customer
  ON assinaturas(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_assinaturas_stripe_subscription
  ON assinaturas(stripe_subscription_id);

-- ============================================================
-- 2. COLUNAS EXTRAS em pagamentos
-- Tabela já existe (001) com schema de anunciante.
-- Adicionar colunas para Stripe invoices de garagens.
-- ============================================================
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS garagem_id uuid REFERENCES public.garagens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text;

CREATE INDEX IF NOT EXISTS idx_pagamentos_garagem
  ON pagamentos(garagem_id);

CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_invoice
  ON pagamentos(stripe_invoice_id);

-- ============================================================
-- 3. ATUALIZAR CHECK de status em assinaturas
-- Adicionar 'cancelada' ao check constraint existente
-- ============================================================

-- Dropar constraint antiga e recriar com 'cancelada'
ALTER TABLE public.assinaturas DROP CONSTRAINT IF EXISTS assinaturas_status_check;
ALTER TABLE public.assinaturas
  ADD CONSTRAINT assinaturas_status_check
  CHECK (status IN ('ativa', 'cancelada', 'inadimplente', 'trial', 'expirada'));
