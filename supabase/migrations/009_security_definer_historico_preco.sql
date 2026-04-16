-- Torna registrar_historico_preco SECURITY DEFINER para que o trigger
-- possa inserir em historico_preco sem depender da RLS do usuário chamador.
-- SET search_path = public evita search_path injection (boa prática com SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.registrar_historico_preco()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
begin
  if (TG_OP = 'INSERT' and new.status = 'publicado') or
     (TG_OP = 'UPDATE' and new.preco <> old.preco) then
    insert into historico_preco (veiculo_id, preco) values (new.id, new.preco);
  end if;
  return new;
end;
$$;
