-- Refatora o RPC incrementar_visualizacao_veiculo para também gravar snapshot diário.
-- SECURITY DEFINER = roda como postgres, bypassa RLS na visualizacoes_diarias.
-- Usa $func$ em vez de $$ para compatibilidade com o SQL editor do Supabase.
-- NÃO alterar a migração 003 — migrações são imutáveis após aplicadas.

-- A função existente retorna bigint (migração 003). DROP + CREATE para preservar o tipo.
DROP FUNCTION IF EXISTS public.incrementar_visualizacao_veiculo(uuid);

CREATE OR REPLACE FUNCTION public.incrementar_visualizacao_veiculo(p_veiculo_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  novo_total bigint;
BEGIN
  -- 1. Incrementa contador total na tabela veiculos (comportamento original — migração 003)
  UPDATE public.veiculos
  SET visualizacoes = visualizacoes + 1
  WHERE id = p_veiculo_id
  RETURNING visualizacoes INTO novo_total;

  -- Veículo não encontrado: retorna null sem levantar exceção
  IF novo_total IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Upsert no snapshot diário (novo — migração 006)
  INSERT INTO public.visualizacoes_diarias (veiculo_id, data, total_dia)
  VALUES (p_veiculo_id, CURRENT_DATE, 1)
  ON CONFLICT (veiculo_id, data)
  DO UPDATE SET total_dia = public.visualizacoes_diarias.total_dia + 1;

  RETURN novo_total;
END;
$func$;

-- Garante que anon/authenticated não chamam o RPC diretamente
REVOKE ALL ON FUNCTION public.incrementar_visualizacao_veiculo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.incrementar_visualizacao_veiculo(uuid) TO service_role;
