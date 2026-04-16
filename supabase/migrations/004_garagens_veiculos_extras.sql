-- ============================================================
-- MIGRAÇÃO 004: Colunas extras em garagens e veiculos
-- Resolve gaps identificados no mapeamento mock → banco (Módulo 3)
-- ============================================================

-- garagens.total_estoque: qtd de veículos em estoque exibida no card da garagem
ALTER TABLE public.garagens
  ADD COLUMN IF NOT EXISTS total_estoque integer NOT NULL DEFAULT 0;

-- garagens.anos_plataforma: tempo de atividade na plataforma (exibido no perfil)
ALTER TABLE public.garagens
  ADD COLUMN IF NOT EXISTS anos_plataforma integer NOT NULL DEFAULT 0;

-- veiculos.publicado_em: timestamp de quando o veículo foi publicado
-- distinto de created_at, que marca a criação do rascunho
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS publicado_em timestamptz;
