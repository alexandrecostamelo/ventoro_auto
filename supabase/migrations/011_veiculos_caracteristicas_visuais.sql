-- Características visuais do veículo — "Cérebro do Veículo"
-- Serve como âncora e documentação legal para processamento VenStudio
-- Usuário revisa e confirma antes de qualquer processamento IA

ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS cor_detalhes text;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tipo_roda text;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tem_faroi_neblina boolean DEFAULT false;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tem_teto_solar boolean DEFAULT false;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tem_rack_teto boolean DEFAULT false;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tem_spoiler_traseiro boolean DEFAULT false;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS condicao_visual text
  CHECK (condicao_visual IN ('impecavel', 'bom', 'marcas_uso', 'riscos_visiveis'));
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS caracteristicas_visuais_reviewed boolean DEFAULT false;
