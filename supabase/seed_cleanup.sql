-- ============================================================
-- VENTORO — seed_cleanup.sql
-- Remove TODOS os dados inseridos pelo seed.sql
-- ============================================================
-- Execute ANTES de subir para produção ou para resetar o ambiente de dev.
-- Os usuários de teste devem ser deletados manualmente no Dashboard
-- Authentication → Users após rodar este script.
-- ============================================================

DO $$
BEGIN

  -- 1. Buscas salvas dos usuários de teste
  DELETE FROM public.buscas_salvas
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@ventoro-teste.com'
  );

  -- 2. Favoritos dos usuários de teste
  DELETE FROM public.favoritos
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@ventoro-teste.com'
  );

  -- 3. Leads das garagens de teste
  DELETE FROM public.leads
  WHERE garagem_id IN (
    SELECT id FROM public.garagens WHERE slug IN ('mb-motors-premium', 'auto-excellence')
  );

  -- 4. Conteúdo IA dos veículos de teste
  DELETE FROM public.conteudo_ia
  WHERE veiculo_id IN (
    SELECT id FROM public.veiculos
    WHERE anunciante_id IN (SELECT id FROM auth.users WHERE email LIKE '%@ventoro-teste.com')
  );

  -- 5. Histórico de preço dos veículos de teste
  DELETE FROM public.historico_preco
  WHERE veiculo_id IN (
    SELECT id FROM public.veiculos
    WHERE anunciante_id IN (SELECT id FROM auth.users WHERE email LIKE '%@ventoro-teste.com')
  );

  -- 6. Fotos dos veículos de teste
  DELETE FROM public.fotos_veiculo
  WHERE veiculo_id IN (
    SELECT id FROM public.veiculos
    WHERE anunciante_id IN (SELECT id FROM auth.users WHERE email LIKE '%@ventoro-teste.com')
  );

  -- 7. Veículos dos usuários de teste
  DELETE FROM public.veiculos
  WHERE anunciante_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@ventoro-teste.com'
  );

  -- 8. Assinaturas das garagens de teste
  DELETE FROM public.assinaturas
  WHERE garagem_id IN (
    SELECT id FROM public.garagens WHERE slug IN ('mb-motors-premium', 'auto-excellence')
  );

  -- 9. Desvincula os usuários garagem antes de deletar as garagens
  UPDATE public.profiles
  SET garagem_id = NULL
  WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@ventoro-teste.com');

  -- 10. Garagens de teste
  DELETE FROM public.garagens
  WHERE slug IN ('mb-motors-premium', 'auto-excellence');

  -- 11. Profiles são deletados automaticamente via CASCADE quando auth.users for removido.
  --     Deletar os 6 usuários no Dashboard → Authentication → Users
  --     (buscar por @ventoro-teste.com)

  RAISE NOTICE 'Cleanup concluído! Agora delete os 6 usuários @ventoro-teste.com no Dashboard Auth.';

END;
$$;
