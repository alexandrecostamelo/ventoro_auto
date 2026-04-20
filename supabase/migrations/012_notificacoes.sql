-- ============================================================
-- MIGRAÇÃO 012: Sistema de notificações in-app
-- Tabela notificacoes + RLS + 3 triggers (queda preço, match busca, vendido)
-- ============================================================

-- ============================================================
-- 1. TABELA notificacoes
-- ============================================================
CREATE TABLE public.notificacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('queda_preco', 'novo_match', 'alta_procura', 'vendido')),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL,
  busca_salva_id uuid REFERENCES public.buscas_salvas(id) ON DELETE SET NULL,
  dados jsonb DEFAULT '{}',
  lida boolean DEFAULT false NOT NULL
);

CREATE INDEX idx_notificacoes_user_lida ON notificacoes(user_id, lida, created_at DESC);
CREATE INDEX idx_notificacoes_user_created ON notificacoes(user_id, created_at DESC);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê suas notificações"
  ON notificacoes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza suas notificações"
  ON notificacoes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuário deleta suas notificações"
  ON notificacoes FOR DELETE USING (auth.uid() = user_id);

-- Sistema (triggers SECURITY DEFINER) pode inserir
CREATE POLICY "Sistema insere notificações"
  ON notificacoes FOR INSERT WITH CHECK (true);

-- ============================================================
-- 2. HABILITAR REALTIME na tabela notificacoes
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;

-- ============================================================
-- 3. TRIGGER — QUEDA DE PREÇO
-- Dispara quando historico_preco recebe INSERT com preço menor
-- que o registro anterior do mesmo veículo.
-- Notifica todos os usuários que favoritaram (exceto o anunciante).
-- Anti-spam: máx 1 por (user + veículo + tipo) por dia.
-- ============================================================
CREATE OR REPLACE FUNCTION notificar_queda_preco()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preco_anterior numeric;
  v_veiculo record;
  v_diferenca numeric;
  v_percentual numeric;
BEGIN
  -- Buscar preço anterior (o mais recente antes deste)
  SELECT preco INTO v_preco_anterior
  FROM historico_preco
  WHERE veiculo_id = NEW.veiculo_id AND id != NEW.id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Sem histórico anterior ou não é queda → sair
  IF v_preco_anterior IS NULL OR NEW.preco >= v_preco_anterior THEN
    RETURN NEW;
  END IF;

  -- Info do veículo
  SELECT marca, modelo, ano, anunciante_id
  INTO v_veiculo
  FROM veiculos
  WHERE id = NEW.veiculo_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  v_diferenca := v_preco_anterior - NEW.preco;
  v_percentual := ROUND((v_diferenca / v_preco_anterior * 100)::numeric, 1);

  -- Criar notificação pra cada favorito (exceto o anunciante, anti-spam por dia)
  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, veiculo_id, dados)
  SELECT
    f.user_id,
    'queda_preco',
    v_veiculo.marca || ' ' || v_veiculo.modelo || ' ' || v_veiculo.ano || ' baixou de preço',
    'Caiu ' || v_percentual || '% — agora por R$ ' || TO_CHAR(NEW.preco, 'FM999G999G999') || ' (era R$ ' || TO_CHAR(v_preco_anterior, 'FM999G999G999') || ')',
    NEW.veiculo_id,
    jsonb_build_object(
      'preco_anterior', v_preco_anterior,
      'preco_novo', NEW.preco,
      'diferenca', v_diferenca,
      'percentual', v_percentual
    )
  FROM favoritos f
  WHERE f.veiculo_id = NEW.veiculo_id
    AND f.user_id != v_veiculo.anunciante_id  -- não notificar o próprio anunciante
    AND NOT EXISTS (
      SELECT 1 FROM notificacoes n
      WHERE n.user_id = f.user_id
        AND n.tipo = 'queda_preco'
        AND n.veiculo_id = NEW.veiculo_id
        AND n.created_at > CURRENT_DATE
    );

  RETURN NEW;
END;
$$;

CREATE TRIGGER historico_preco_notifica_queda
  AFTER INSERT ON historico_preco
  FOR EACH ROW EXECUTE FUNCTION notificar_queda_preco();

-- ============================================================
-- 4. TRIGGER — NOVO ANÚNCIO COMPATÍVEL COM BUSCA SALVA
-- Dispara quando veículo é publicado (INSERT/UPDATE com status='publicado').
-- Verifica match contra buscas_salvas ativas.
-- Anti-spam: máx 1 por (user + busca_salva + veículo) por dia.
-- ============================================================
CREATE OR REPLACE FUNCTION notificar_match_busca_salva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_busca record;
  v_filtros jsonb;
BEGIN
  -- Só dispara quando status muda pra 'publicado'
  IF TG_OP = 'INSERT' AND NEW.status != 'publicado' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status != 'publicado' THEN RETURN NEW; END IF;
    IF OLD.status = 'publicado' THEN RETURN NEW; END IF;  -- já era publicado
  END IF;

  -- Verificar cada busca salva ativa
  FOR v_busca IN
    SELECT id, user_id, nome, filtros
    FROM buscas_salvas
    WHERE ativa = true
      AND user_id != NEW.anunciante_id  -- não notificar o próprio anunciante
  LOOP
    v_filtros := v_busca.filtros;

    -- Verificar match de cada critério (todos devem passar)
    IF (v_filtros->>'marca' IS NOT NULL AND NOT NEW.marca ILIKE '%' || (v_filtros->>'marca') || '%') THEN CONTINUE; END IF;
    IF (v_filtros->>'modelo' IS NOT NULL AND NOT NEW.modelo ILIKE '%' || (v_filtros->>'modelo') || '%') THEN CONTINUE; END IF;
    IF (v_filtros->>'preco_min' IS NOT NULL AND NEW.preco < (v_filtros->>'preco_min')::numeric) THEN CONTINUE; END IF;
    IF (v_filtros->>'preco_max' IS NOT NULL AND NEW.preco > (v_filtros->>'preco_max')::numeric) THEN CONTINUE; END IF;
    IF (v_filtros->>'ano_min' IS NOT NULL AND NEW.ano < (v_filtros->>'ano_min')::integer) THEN CONTINUE; END IF;
    IF (v_filtros->>'ano_max' IS NOT NULL AND NEW.ano > (v_filtros->>'ano_max')::integer) THEN CONTINUE; END IF;
    IF (v_filtros->>'km_max' IS NOT NULL AND NEW.quilometragem > (v_filtros->>'km_max')::integer) THEN CONTINUE; END IF;
    IF (v_filtros->>'combustivel' IS NOT NULL AND NEW.combustivel != v_filtros->>'combustivel') THEN CONTINUE; END IF;
    IF (v_filtros->>'cambio' IS NOT NULL AND NEW.cambio != v_filtros->>'cambio') THEN CONTINUE; END IF;
    IF (v_filtros->>'cidade' IS NOT NULL AND NOT NEW.cidade ILIKE '%' || (v_filtros->>'cidade') || '%') THEN CONTINUE; END IF;
    IF (v_filtros->>'estado' IS NOT NULL AND NEW.estado != v_filtros->>'estado') THEN CONTINUE; END IF;

    -- Match! Inserir notificação (com anti-spam)
    INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, veiculo_id, busca_salva_id, dados)
    SELECT
      v_busca.user_id,
      'novo_match',
      'Novo ' || NEW.marca || ' ' || NEW.modelo || ' ' || NEW.ano || ' compatível',
      NEW.marca || ' ' || NEW.modelo || ' ' || NEW.ano || ' em ' || NEW.cidade || ' por R$ ' || TO_CHAR(NEW.preco, 'FM999G999G999') || ' — compatível com "' || v_busca.nome || '"',
      NEW.id,
      v_busca.id,
      jsonb_build_object('busca_nome', v_busca.nome, 'filtros', v_filtros)
    WHERE NOT EXISTS (
      SELECT 1 FROM notificacoes n
      WHERE n.user_id = v_busca.user_id
        AND n.tipo = 'novo_match'
        AND n.veiculo_id = NEW.id
        AND n.busca_salva_id = v_busca.id
        AND n.created_at > CURRENT_DATE
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER veiculo_notifica_match_busca
  AFTER INSERT OR UPDATE ON veiculos
  FOR EACH ROW EXECUTE FUNCTION notificar_match_busca_salva();

-- ============================================================
-- 5. TRIGGER — VEÍCULO VENDIDO
-- Dispara quando status muda pra 'vendido'.
-- Notifica todos que favoritaram (exceto anunciante).
-- ============================================================
CREATE OR REPLACE FUNCTION notificar_veiculo_vendido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_veiculo record;
BEGIN
  -- Só dispara quando status muda pra 'vendido'
  IF OLD.status = 'vendido' THEN RETURN NEW; END IF;
  IF NEW.status != 'vendido' THEN RETURN NEW; END IF;

  SELECT marca, modelo, ano INTO v_veiculo
  FROM veiculos WHERE id = NEW.id;

  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, veiculo_id, dados)
  SELECT
    f.user_id,
    'vendido',
    v_veiculo.marca || ' ' || v_veiculo.modelo || ' ' || v_veiculo.ano || ' foi vendido',
    'O ' || v_veiculo.marca || ' ' || v_veiculo.modelo || ' ' || v_veiculo.ano || ' que você favoritou foi vendido. Veja veículos similares.',
    NEW.id,
    jsonb_build_object('preco_final', NEW.preco)
  FROM favoritos f
  WHERE f.veiculo_id = NEW.id
    AND f.user_id != NEW.anunciante_id
    AND NOT EXISTS (
      SELECT 1 FROM notificacoes n
      WHERE n.user_id = f.user_id
        AND n.tipo = 'vendido'
        AND n.veiculo_id = NEW.id
    );

  RETURN NEW;
END;
$$;

CREATE TRIGGER veiculo_notifica_vendido
  AFTER UPDATE ON veiculos
  FOR EACH ROW EXECUTE FUNCTION notificar_veiculo_vendido();

-- ============================================================
-- 6. COLUNA config_notificacoes em profiles
-- Permite cada usuário controlar quais tipos de alerta quer receber.
-- Default: todos ativados.
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS config_notificacoes jsonb DEFAULT '{"queda_preco": true, "novo_match": true, "alta_procura": true, "vendido": true}'::jsonb;
