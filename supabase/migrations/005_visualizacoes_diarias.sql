-- Tabela de snapshots diários de visualizações por veículo.
-- Alimentada pelo RPC incrementar_visualizacao_veiculo (migração 006).
-- NÃO inserir dados fabricados aqui — histórico começa do zero a partir desta migração.

CREATE TABLE IF NOT EXISTS public.visualizacoes_diarias (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id  uuid        NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  data        date        NOT NULL,
  total_dia   integer     NOT NULL DEFAULT 0 CHECK (total_dia >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visualizacoes_diarias_veiculo_data_unique UNIQUE (veiculo_id, data)
);

-- Índice principal: série temporal por veículo (queries do gráfico)
CREATE INDEX IF NOT EXISTS idx_visualizacoes_diarias_veiculo_data
  ON public.visualizacoes_diarias (veiculo_id, data DESC);

-- Índice secundário: queries agregadas por período (SUM por data, JOIN com veiculos)
CREATE INDEX IF NOT EXISTS idx_visualizacoes_diarias_data
  ON public.visualizacoes_diarias (data);

-- RLS
ALTER TABLE public.visualizacoes_diarias ENABLE ROW LEVEL SECURITY;

-- Anunciante particular vê os snapshots dos seus veículos
CREATE POLICY "anunciante_particular_select_visualizacoes_diarias"
  ON public.visualizacoes_diarias
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.veiculos v
      WHERE v.id = visualizacoes_diarias.veiculo_id
        AND v.anunciante_id = auth.uid()
    )
  );

-- Garagem vê os snapshots dos veículos dela (para Módulo 4E)
CREATE POLICY "garagem_select_visualizacoes_diarias"
  ON public.visualizacoes_diarias
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.veiculos v
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE v.id = visualizacoes_diarias.veiculo_id
        AND v.garagem_id = p.garagem_id
        AND p.garagem_id IS NOT NULL
    )
  );

-- INSERT e UPDATE apenas via service_role (RPC com SECURITY DEFINER)
-- Não há política de escrita para authenticated/anon — negado por padrão.
