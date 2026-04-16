-- ============================================================
-- MIGRAÇÃO 003: RPC incrementar_visualizacao_veiculo
-- Diferente da função existente (incrementar_visualizacoes):
--   - Retorna bigint (o novo total) em vez de void
--   - Retorna NULL se o veículo não existir (para 404 na Edge Function)
--   - Nome diferente para não colidir com a função existente
-- ============================================================

CREATE OR REPLACE FUNCTION incrementar_visualizacao_veiculo(p_veiculo_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  novo_total bigint;
BEGIN
  UPDATE veiculos
  SET visualizacoes = visualizacoes + 1
  WHERE id = p_veiculo_id
  RETURNING visualizacoes INTO novo_total;
  -- novo_total será NULL se nenhuma linha foi atualizada (veículo não existe)
  RETURN novo_total;
END;
$$;
