-- Adiciona coluna aceita_troca na tabela veiculos
-- Estava ausente do schema inicial; necessária para o wizard de publicação (Módulo 4F)

ALTER TABLE veiculos
  ADD COLUMN IF NOT EXISTS aceita_troca boolean DEFAULT false;
