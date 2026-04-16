-- ============================================================
-- VENTORO — seed.sql
-- Dados de teste para desenvolvimento (Módulo 3 — Fase 2)
-- ============================================================
--
-- PRÉ-REQUISITO: criar os 6 usuários no Supabase Auth ANTES de rodar.
-- Dashboard → Authentication → Users → Add user (invite / create)
--
-- E-mails e senhas:
--   joao.particular@ventoro-teste.com   | Teste@123  (tipo: particular)
--   maria.particular@ventoro-teste.com  | Teste@123  (tipo: particular)
--   carlos.garagem@ventoro-teste.com    | Teste@123  (tipo: garagem)
--   ricardo.garagem@ventoro-teste.com   | Teste@123  (tipo: garagem)
--   amanda.comprador@ventoro-teste.com  | Teste@123  (tipo: comprador)
--   bruno.comprador@ventoro-teste.com   | Teste@123  (tipo: comprador)
--
-- Os UUIDs são gerados dinamicamente pelo banco.
-- O seed lê os IDs pelo e-mail — sem UUIDs fixos no arquivo.
--
-- CONTAGEM ESPERADA APÓS O SEED:
--   profiles        6  (atualizados via ON CONFLICT)
--   garagens        2
--   assinaturas     2
--   veiculos       17
--   fotos_veiculo  42  (3 por veículo publicado/vendido exceto vhc05 com 2 e vhc16 com 1; vhc10 rascunho e vhc17 pausado sem fotos)
--   favoritos       8  (4 por comprador)
--   leads          10  (5 por garagem)
--   buscas_salvas   4  (2 por comprador)
-- ============================================================

DO $$
DECLARE
  -- IDs dos usuários (lidos do auth.users pelo e-mail)
  v_usr_joao    uuid;
  v_usr_maria   uuid;
  v_usr_carlos  uuid;
  v_usr_ricardo uuid;
  v_usr_amanda  uuid;
  v_usr_bruno   uuid;

  -- IDs das garagens (gerados aqui)
  v_grg_mb     uuid;
  v_grg_ae     uuid;

  -- IDs dos veículos (17 no total)
  v_vhc01 uuid; -- Honda Civic EXL 2022          (João — particular)
  v_vhc02 uuid; -- Jeep Compass Limited 2022      (João — particular)
  v_vhc03 uuid; -- VW T-Cross Highline 2022       (João — particular)
  v_vhc04 uuid; -- Hyundai HB20S Diamond 2021     (Maria — particular)
  v_vhc05 uuid; -- VW Polo GTS 2022               (Maria — particular, VENDIDO)
  v_vhc06 uuid; -- Toyota Corolla Altis 2023      (MB Motors)
  v_vhc07 uuid; -- BMW 320i Sport GP 2023         (MB Motors)
  v_vhc08 uuid; -- Audi A3 Sedan 2022             (MB Motors)
  v_vhc09 uuid; -- Honda HR-V EXL 2022            (MB Motors)
  v_vhc10 uuid; -- Toyota Yaris XLS 2022          (MB Motors, RASCUNHO, incompleto)
  v_vhc11 uuid; -- BYD Dolphin Plus 2023          (MB Motors, ELÉTRICO)
  v_vhc12 uuid; -- Ford Ranger XLS Diesel 2021    (Auto Excellence)
  v_vhc13 uuid; -- Chevrolet S10 LTZ 2022         (Auto Excellence)
  v_vhc14 uuid; -- Toyota Hilux SRX 2023          (Auto Excellence)
  v_vhc15 uuid; -- Chevrolet Onix Plus LTZ 2023   (Auto Excellence)
  v_vhc16 uuid; -- Fiat Pulse Drive 2023          (Auto Excellence, dados incompletos)
  v_vhc17 uuid; -- Fiat Argo Trekking 2022        (Auto Excellence, PAUSADO, incompleto)

BEGIN

  -- ============================================================
  -- 1. BUSCAR IDs DOS USUÁRIOS (lidos do auth.users por e-mail)
  -- ============================================================
  SELECT id INTO v_usr_joao    FROM auth.users WHERE email = 'joao.particular@ventoro-teste.com';
  SELECT id INTO v_usr_maria   FROM auth.users WHERE email = 'maria.particular@ventoro-teste.com';
  SELECT id INTO v_usr_carlos  FROM auth.users WHERE email = 'carlos.garagem@ventoro-teste.com';
  SELECT id INTO v_usr_ricardo FROM auth.users WHERE email = 'ricardo.garagem@ventoro-teste.com';
  SELECT id INTO v_usr_amanda  FROM auth.users WHERE email = 'amanda.comprador@ventoro-teste.com';
  SELECT id INTO v_usr_bruno   FROM auth.users WHERE email = 'bruno.comprador@ventoro-teste.com';

  -- Aborta se algum usuário não foi criado no Auth
  IF v_usr_joao    IS NULL THEN RAISE EXCEPTION 'Usuário joao.particular@ventoro-teste.com não encontrado no Auth'; END IF;
  IF v_usr_maria   IS NULL THEN RAISE EXCEPTION 'Usuário maria.particular@ventoro-teste.com não encontrado no Auth'; END IF;
  IF v_usr_carlos  IS NULL THEN RAISE EXCEPTION 'Usuário carlos.garagem@ventoro-teste.com não encontrado no Auth'; END IF;
  IF v_usr_ricardo IS NULL THEN RAISE EXCEPTION 'Usuário ricardo.garagem@ventoro-teste.com não encontrado no Auth'; END IF;
  IF v_usr_amanda  IS NULL THEN RAISE EXCEPTION 'Usuário amanda.comprador@ventoro-teste.com não encontrado no Auth'; END IF;
  IF v_usr_bruno   IS NULL THEN RAISE EXCEPTION 'Usuário bruno.comprador@ventoro-teste.com não encontrado no Auth'; END IF;

  -- ============================================================
  -- 2. GERAR UUIDs
  -- ============================================================
  v_grg_mb  := gen_random_uuid();
  v_grg_ae  := gen_random_uuid();

  v_vhc01 := gen_random_uuid();
  v_vhc02 := gen_random_uuid();
  v_vhc03 := gen_random_uuid();
  v_vhc04 := gen_random_uuid();
  v_vhc05 := gen_random_uuid();
  v_vhc06 := gen_random_uuid();
  v_vhc07 := gen_random_uuid();
  v_vhc08 := gen_random_uuid();
  v_vhc09 := gen_random_uuid();
  v_vhc10 := gen_random_uuid();
  v_vhc11 := gen_random_uuid();
  v_vhc12 := gen_random_uuid();
  v_vhc13 := gen_random_uuid();
  v_vhc14 := gen_random_uuid();
  v_vhc15 := gen_random_uuid();
  v_vhc16 := gen_random_uuid();
  v_vhc17 := gen_random_uuid();

  -- ============================================================
  -- 3. ATUALIZAR PROFILES
  -- O trigger handle_new_user cria o profile automaticamente no signup.
  -- Aqui apenas completamos os dados.
  -- ============================================================
  UPDATE public.profiles SET
    nome = 'João Victor', tipo = 'particular',
    telefone = '(18) 99876-5432', cidade = 'Presidente Prudente', estado = 'SP',
    avatar_url = 'https://ui-avatars.com/api/?name=Joao+Victor&background=1D9E75&color=fff&size=128'
  WHERE id = v_usr_joao;

  UPDATE public.profiles SET
    nome = 'Maria Fernanda', tipo = 'particular',
    telefone = '(11) 99765-4321', cidade = 'São Paulo', estado = 'SP',
    avatar_url = 'https://ui-avatars.com/api/?name=Maria+Fernanda&background=534AB7&color=fff&size=128'
  WHERE id = v_usr_maria;

  UPDATE public.profiles SET
    nome = 'Carlos Augusto', tipo = 'garagem',
    telefone = '(11) 93456-7890', cidade = 'São Paulo', estado = 'SP',
    avatar_url = 'https://ui-avatars.com/api/?name=Carlos+Augusto&background=085041&color=fff&size=128'
  WHERE id = v_usr_carlos;

  UPDATE public.profiles SET
    nome = 'Ricardo Lima', tipo = 'garagem',
    telefone = '(19) 93456-7890', cidade = 'Campinas', estado = 'SP',
    avatar_url = 'https://ui-avatars.com/api/?name=Ricardo+Lima&background=EF9F27&color=fff&size=128'
  WHERE id = v_usr_ricardo;

  UPDATE public.profiles SET
    nome = 'Amanda Silva', tipo = 'comprador',
    telefone = '(11) 98765-4321', cidade = 'São Paulo', estado = 'SP',
    avatar_url = 'https://ui-avatars.com/api/?name=Amanda+Silva&background=1D9E75&color=fff&size=128'
  WHERE id = v_usr_amanda;

  UPDATE public.profiles SET
    nome = 'Bruno Costa', tipo = 'comprador',
    telefone = '(21) 97654-3210', cidade = 'Rio de Janeiro', estado = 'RJ',
    avatar_url = 'https://ui-avatars.com/api/?name=Bruno+Costa&background=534AB7&color=fff&size=128'
  WHERE id = v_usr_bruno;

  -- ============================================================
  -- 4. INSERIR GARAGENS
  -- ============================================================
  INSERT INTO public.garagens (
    id, slug, nome, razao_social, cnpj,
    descricao, logo_url, capa_url,
    cidade, estado, telefone, whatsapp, email, especialidade,
    plano, ativa, verificada, cnpj_verificado,
    score_confianca, total_vendas, avaliacao, tempo_resposta_minutos,
    total_estoque, anos_plataforma
  ) VALUES (
    v_grg_mb, 'mb-motors-premium', 'MB Motors Premium',
    'MB Motors Comércio de Veículos Ltda', '12.345.678/0001-90',
    'Especialistas em seminovos premium e de alto padrão desde 2008. Mais de 140 veículos vendidos com satisfação garantida.',
    'https://ui-avatars.com/api/?name=MB+Motors&background=534AB7&color=fff&size=128&font-size=0.4&bold=true',
    'https://images.unsplash.com/photo-1567449303078-57ad995bd329?w=1200&q=80',
    'São Paulo', 'SP', '(11) 3456-7890', '11934567890', 'contato@mbmotors.com.br', 'Seminovos premium',
    'premium', true, true, true,
    99, 142, 4.9, 8,
    6, 3
  );

  INSERT INTO public.garagens (
    id, slug, nome, razao_social, cnpj,
    descricao, logo_url, capa_url,
    cidade, estado, telefone, whatsapp, email, especialidade,
    plano, ativa, verificada, cnpj_verificado,
    score_confianca, total_vendas, avaliacao, tempo_resposta_minutos,
    total_estoque, anos_plataforma
  ) VALUES (
    v_grg_ae, 'auto-excellence', 'Auto Excellence',
    'Auto Excellence Comércio de Veículos Ltda', '98.765.432/0001-10',
    'Referência em veículos seminovos na região de Campinas. Atendimento humanizado e transparência total.',
    'https://ui-avatars.com/api/?name=Auto+E&background=1D9E75&color=fff&size=128&font-size=0.4&bold=true',
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&q=80',
    'Campinas', 'SP', '(19) 3456-7890', '19934567890', 'contato@autoexcellence.com.br', 'Seminovos multimarcas',
    'pro', true, true, true,
    95, 98, 4.7, 15,
    11, 2
  );

  -- Vincular usuários garagem aos seus estabelecimentos
  UPDATE public.profiles SET garagem_id = v_grg_mb, tipo = 'garagem' WHERE id = v_usr_carlos;
  UPDATE public.profiles SET garagem_id = v_grg_ae, tipo = 'garagem' WHERE id = v_usr_ricardo;

  -- ============================================================
  -- 5. INSERIR ASSINATURAS
  -- ============================================================
  INSERT INTO public.assinaturas (garagem_id, plano, status, valor_mensal, proxima_cobranca) VALUES
    (v_grg_mb, 'premium', 'ativa', 499.90, now() + interval '30 days'),
    (v_grg_ae, 'pro',     'ativa', 299.90, now() + interval '30 days');

  -- ============================================================
  -- 6. INSERIR VEÍCULOS
  -- ============================================================

  -- vhc01: Honda Civic EXL CVT 2022 (João — particular)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia, torque, consumo_cidade, consumo_estrada,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    selo_studio_ia, selo_video_ia, selo_inspecao, destaque,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc01, 'honda-civic-exl-2022-prata-sp', 'Honda', 'Civic', 'EXL CVT', 2022, 28000, 128900,
    'flex', 'cvt', 'Prata Lunar', '173 cv', '22,4 kgfm', '11,8 km/l', '14,2 km/l',
    'Presidente Prudente', 'SP',
    'Honda Civic EXL 2022 em perfeito estado de conservação. Único dono, todas as revisões feitas na concessionária Honda. IPVA 2025 pago. Sem histórico de sinistros.',
    ARRAY['Ar-condicionado automático','Câmera de ré 360°','Central multimídia 9"','Teto solar elétrico','Bancos em couro','Sensor de estacionamento','Faróis full LED','Apple CarPlay e Android Auto','Piloto automático adaptativo','Frenagem automática'],
    'excelente', true, true, true, 2,
    'publicado', 'particular', v_usr_joao, 'premium',
    96, 'abaixo', 122000, 134000,
    true, true, true, true,
    847, '2025-03-10'
  );

  -- vhc02: Jeep Compass Limited Flex 2022 (João — particular)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    selo_studio_ia, selo_video_ia, selo_inspecao, destaque,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc02, 'jeep-compass-limited-flex-2022-sp', 'Jeep', 'Compass', 'Limited T270 Flex', 2022, 35000, 149900,
    'flex', 'automatico', 'Cinza Granite', '185 cv',
    'Presidente Prudente', 'SP',
    'Jeep Compass Limited 2022 Flex com pacote completo. Interior impecável, sem arranhões na lataria.',
    ARRAY['Ar-condicionado dual zone','Câmera 360°','Central multimídia 8.4"','Teto solar panorâmico','Bancos em couro','Piloto automático'],
    'otimo', true, true, false, 1,
    'publicado', 'particular', v_usr_joao, 'basico',
    88, 'na_media', 145000, 155000,
    true, true, false, true,
    534, '2025-03-14'
  );

  -- vhc03: VW T-Cross Highline TSI 2022 (João — particular)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc03, 'vw-tcross-highline-2022-vermelho-sp', 'Volkswagen', 'T-Cross', 'Highline TSI', 2022, 31000, 119900,
    'flex', 'automatico', 'Vermelho Sunset', '150 cv',
    'Presidente Prudente', 'SP',
    'VW T-Cross Highline TSI 2022. Veículo completo com ótimo custo-benefício. Revisões em dia.',
    ARRAY['Ar-condicionado digital','Câmera de ré','Central VW Play','Teto solar','Sensor de estacionamento'],
    'bom', false, true, true, 1,
    'publicado', 'particular', v_usr_joao, 'basico',
    85, 'acima', 110000, 118000,
    298, '2025-03-05'
  );

  -- vhc04: Hyundai HB20S Diamond Plus 2021 (Maria — particular)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc04, 'hyundai-hb20s-diamond-plus-2021-cinza-sp', 'Hyundai', 'HB20S', 'Diamond Plus', 2021, 44000, 79900,
    'flex', 'automatico', 'Cinza Sand', '120 cv',
    'São Paulo', 'SP',
    'Hyundai HB20S Diamond Plus 2021. Segundo dono, todas as revisões feitas. Excelente primeiro carro premium.',
    ARRAY['Ar-condicionado','Câmera de ré','Central multimídia BlueMedia','Rodas de liga 16"'],
    'bom', true, true, false, 1,
    'publicado', 'particular', v_usr_maria, 'basico',
    82, 'abaixo', 78000, 86000,
    189, '2025-03-01'
  );

  -- vhc05: VW Polo GTS 2022 (Maria — VENDIDO)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc05, 'vw-polo-gts-2022-vermelho-sp-vendido', 'Volkswagen', 'Polo', 'GTS 1.4 TSI', 2022, 26000, 109900,
    'flex', 'automatico', 'Vermelho Sunset', '150 cv',
    'São Paulo', 'SP',
    'VW Polo GTS 2022 — o hot hatch da Volkswagen. Visual esportivo, performance e economia.',
    ARRAY['Ar-condicionado digital','Central VW Play','Bancos esportivos','Rodas 17"','Spoiler traseiro'],
    'excelente', true, true, true, 2,
    'vendido', 'particular', v_usr_maria, 'basico',
    87, 'na_media', 105000, 115000,
    312, '2024-12-01'
  );

  -- vhc06: Toyota Corolla Altis Premium 2023 (MB Motors)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia, torque, consumo_cidade, consumo_estrada,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, garagem_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    selo_studio_ia, selo_video_ia, selo_inspecao, destaque,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc06, 'toyota-corolla-altis-2023-branco-sp', 'Toyota', 'Corolla', 'Altis Premium', 2023, 15000, 159900,
    'flex', 'cvt', 'Branco Pérola', '177 cv', '21,4 kgfm', '12,1 km/l', '15,0 km/l',
    'São Paulo', 'SP',
    'Toyota Corolla Altis Premium 2023 com baixa quilometragem. Todas as revisões na concessionária Toyota. Veículo impecável.',
    ARRAY['Ar-condicionado digital','Câmera de ré','Central multimídia 10"','Bancos em couro','Sensor de estacionamento','Faróis LED','Apple CarPlay'],
    'excelente', true, true, true, 2,
    'publicado', 'garagem', v_usr_carlos, v_grg_mb, 'premium',
    94, 'na_media', 155000, 165000,
    true, false, true, true,
    623, '2025-03-12'
  );

  -- vhc07: BMW 320i Sport GP 2023 (MB Motors)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, garagem_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    selo_studio_ia, selo_video_ia, selo_inspecao, destaque,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc07, 'bmw-320i-sport-gp-2023-azul-sp', 'BMW', '320i', 'Sport GP', 2023, 12000, 249900,
    'gasolina', 'automatico', 'Azul Portimão', '184 cv',
    'São Paulo', 'SP',
    'BMW 320i Sport GP 2023 com apenas 12 mil km. Garantia de fábrica até 2026. Estado de zero.',
    ARRAY['Ar-condicionado digital tri-zone','Câmera 360°','Head-up display','Bancos elétricos em couro','Teto solar','Harman Kardon','BMW Connected Drive'],
    'excelente', true, true, true, 2,
    'publicado', 'garagem', v_usr_carlos, v_grg_mb, 'turbo',
    97, 'na_media', 240000, 260000,
    true, true, true, true,
    1203, '2025-03-15'
  );

  -- vhc08: Audi A3 Sedan Performance Black 2022 (MB Motors)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, garagem_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    selo_studio_ia, selo_video_ia, selo_inspecao, destaque,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc08, 'audi-a3-sedan-performance-black-2022-sp', 'Audi', 'A3 Sedan', 'Performance Black S-Tronic', 2022, 22000, 219900,
    'gasolina', 'automatico', 'Preto Mythos', '190 cv',
    'São Paulo', 'SP',
    'Audi A3 Sedan Performance Black 2022. Visual esportivo exclusivo, interior premium. Garantia até 2025.',
    ARRAY['Ar-condicionado tri-zone','Virtual cockpit','Bang & Olufsen','Teto solar','Bancos esportivos em couro','Matrix LED'],
    'otimo', true, true, true, 1,
    'publicado', 'garagem', v_usr_carlos, v_grg_mb, 'premium',
    95, 'abaixo', 218000, 235000,
    true, true, true, true,
    945, '2025-03-11'
  );

  -- vhc09: Honda HR-V EXL CVT 2022 (MB Motors)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, garagem_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc09, 'honda-hrv-exl-2022-cinza-sp', 'Honda', 'HR-V', 'EXL CVT', 2022, 33000, 129900,
    'flex', 'cvt', 'Cinza Shark', '126 cv',
    'São Paulo', 'SP',
    'Honda HR-V EXL 2022. Único dono, revisões em dia. Ideal para família.',
    ARRAY['Ar-condicionado automático','Câmera de ré 360°','Central multimídia 7"','Bancos em couro','Sensor de estacionamento','Apple CarPlay'],
    'otimo', true, true, true, 1,
    'publicado', 'garagem', v_usr_carlos, v_grg_mb, 'basico',
    89, 'na_media', 124000, 136000,
    421, '2025-02-20'
  );

  -- vhc10: Toyota Yaris XLS 2022 (MB Motors — RASCUNHO, dados intencionalmente incompletos)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cidade, estado, condicao,
    status, tipo_anunciante, anunciante_id, garagem_id, plano, score_confianca
  ) VALUES (
    v_vhc10, 'toyota-yaris-xls-2022-rascunho', 'Toyota', 'Yaris', 'XLS', 2022, 41000, 82900,
    'flex', 'automatico', 'São Paulo', 'SP', 'bom',
    'rascunho', 'garagem', v_usr_carlos, v_grg_mb, 'basico', 50
  );

  -- vhc11: BYD Dolphin Plus 2023 (MB Motors — ELÉTRICO)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, garagem_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    selo_studio_ia, selo_video_ia, selo_inspecao, destaque,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc11, 'byd-dolphin-plus-2023-branco-sp', 'BYD', 'Dolphin', 'Plus', 2023, 8000, 149900,
    'eletrico', 'automatico', 'Branco', '204 cv',
    'São Paulo', 'SP',
    'BYD Dolphin Plus 2023 elétrico. Autonomia de 400km. Carregamento rápido DC até 60kW. O futuro chegou.',
    ARRAY['Ar-condicionado automático','Teto solar panorâmico','Central 12.8" giratória','Câmera 360°','Carregador portátil incluso','VALET Mode'],
    'excelente', true, true, true, 2,
    'publicado', 'garagem', v_usr_carlos, v_grg_mb, 'premium',
    93, 'na_media', 145000, 155000,
    true, true, true, true,
    756, '2025-03-20'
  );

  -- vhc12: Ford Ranger XLS Diesel 2021 (Auto Excellence)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, garagem_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc12, 'ford-ranger-xls-diesel-2021-preto-sp', 'Ford', 'Ranger', 'XLS 2.2 Diesel', 2021, 52000, 189900,
    'diesel', 'automatico', 'Preto Pantera', '160 cv',
    'Campinas', 'SP',
    'Ford Ranger XLS 2021 Diesel 4x4. Veículo robusto e bem conservado. Pneus novos, revisão recente.',
    ARRAY['Ar-condicionado','Câmera de ré','Central multimídia','Capota marítima','Estribo lateral'],
    'bom', true, true, false, 1,
    'publicado', 'garagem', v_usr_ricardo, v_grg_ae, 'premium',
    91, 'abaixo', 185000, 198000,
    412, '2025-03-08'
  );

  -- vhc13: Chevrolet S10 LTZ Diesel 2022 (Auto Excellence)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, garagem_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    selo_studio_ia, selo_inspecao, destaque,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc13, 'chevrolet-s10-ltz-diesel-2022-branco-sp', 'Chevrolet', 'S10', 'LTZ 2.8 Diesel 4x4', 2022, 41000, 219900,
    'diesel', 'automatico', 'Branco Summit', '200 cv',
    'Campinas', 'SP',
    'Chevrolet S10 LTZ 2022 Diesel 4x4. Veículo top de linha, perfeito para trabalho e lazer.',
    ARRAY['Ar-condicionado digital','MyLink com tela 8"','Câmera de ré','Bancos em couro','Capota rígida','Santo Antônio'],
    'otimo', true, true, true, 2,
    'publicado', 'garagem', v_usr_ricardo, v_grg_ae, 'premium',
    93, 'na_media', 215000, 228000,
    true, true, true,
    567, '2025-03-13'
  );

  -- vhc14: Toyota Hilux SRX Diesel 2023 (Auto Excellence)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, garagem_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    selo_studio_ia, selo_video_ia, selo_inspecao, destaque,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc14, 'toyota-hilux-srx-diesel-2023-grafite-sp', 'Toyota', 'Hilux', 'SRX 2.8 Diesel 4x4', 2023, 18000, 299900,
    'diesel', 'automatico', 'Cinza Graphite', '204 cv',
    'Campinas', 'SP',
    'Toyota Hilux SRX 2023 com pouquíssima quilometragem. Garantia de fábrica. Estado impecável.',
    ARRAY['Ar-condicionado digital','Central multimídia 8"','Câmera de ré','Bancos em couro','Controle de tração','7 airbags'],
    'excelente', true, true, true, 2,
    'publicado', 'garagem', v_usr_ricardo, v_grg_ae, 'turbo',
    98, 'na_media', 290000, 310000,
    true, true, true, true,
    1456, '2025-03-16'
  );

  -- vhc15: Chevrolet Onix Plus LTZ 2023 (Auto Excellence)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, potencia,
    cidade, estado, descricao, opcionais, condicao,
    ipva_pago, revisoes_em_dia, sem_sinistro, num_chaves,
    status, tipo_anunciante, anunciante_id, garagem_id, plano,
    score_confianca, preco_status, preco_sugerido_min, preco_sugerido_max,
    visualizacoes, publicado_em
  ) VALUES (
    v_vhc15, 'chevrolet-onix-plus-ltz-2023-prata-sp', 'Chevrolet', 'Onix Plus', 'LTZ 1.0T Automático', 2023, 22000, 89900,
    'flex', 'automatico', 'Prata Switch', '116 cv',
    'Campinas', 'SP',
    'Chevrolet Onix Plus LTZ 2023. O sedan mais vendido do Brasil. Econômico, confortável e completo.',
    ARRAY['Ar-condicionado','Central multimídia Mylink 8"','Câmera de ré','Sensor de estacionamento','Apple CarPlay e Android Auto'],
    'otimo', true, true, true, 2,
    'publicado', 'garagem', v_usr_ricardo, v_grg_ae, 'basico',
    84, 'na_media', 86000, 94000,
    203, '2025-02-28'
  );

  -- vhc16: Fiat Pulse Drive 2023 (Auto Excellence — dados intencionalmente incompletos)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cor, cidade, estado, condicao,
    status, tipo_anunciante, anunciante_id, garagem_id, plano,
    score_confianca, visualizacoes, publicado_em
  ) VALUES (
    v_vhc16, 'fiat-pulse-drive-2023-branco-sp', 'Fiat', 'Pulse', 'Drive 1.3 CVT', 2023, 19000, 89900,
    'flex', 'cvt', 'Branco Banchisa', 'Campinas', 'SP', 'bom',
    'publicado', 'garagem', v_usr_ricardo, v_grg_ae, 'basico',
    80, 234, '2025-03-07'
  );

  -- vhc17: Fiat Argo Trekking 2022 (Auto Excellence — PAUSADO, dados incompletos)
  INSERT INTO public.veiculos (
    id, slug, marca, modelo, versao, ano, quilometragem, preco,
    combustivel, cambio, cidade, estado, condicao,
    status, tipo_anunciante, anunciante_id, garagem_id, plano, score_confianca
  ) VALUES (
    v_vhc17, 'fiat-argo-trekking-2022-pausado', 'Fiat', 'Argo', 'Trekking 1.3', 2022, 38000, 72900,
    'flex', 'manual', 'Campinas', 'SP', 'bom',
    'pausado', 'garagem', v_usr_ricardo, v_grg_ae, 'basico', 75
  );

  -- ============================================================
  -- 7. INSERIR FOTOS DOS VEÍCULOS
  -- Opção A: URLs diretas do Unsplash (mesmo padrão do mock.ts)
  -- vhc10 (rascunho) e vhc17 (pausado) ficam sem fotos intencionalmente
  -- ============================================================

  INSERT INTO public.fotos_veiculo (veiculo_id, url_original, ordem, is_capa) VALUES
    (v_vhc01, 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80', 0, true),
    (v_vhc01, 'https://images.unsplash.com/photo-1606611013016-969c19ba27a5?w=800&q=80', 1, false),
    (v_vhc01, 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80', 2, false),

    (v_vhc02, 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80', 0, true),
    (v_vhc02, 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80', 1, false),
    (v_vhc02, 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80', 2, false),

    (v_vhc03, 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80', 0, true),
    (v_vhc03, 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80', 1, false),
    (v_vhc03, 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80', 2, false),

    (v_vhc04, 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=800&q=80', 0, true),
    (v_vhc04, 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80', 1, false),
    (v_vhc04, 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80', 2, false),

    (v_vhc05, 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80', 0, true),
    (v_vhc05, 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80', 1, false),

    (v_vhc06, 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80', 0, true),
    (v_vhc06, 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80', 1, false),
    (v_vhc06, 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80', 2, false),

    (v_vhc07, 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=800&q=80', 0, true),
    (v_vhc07, 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80', 1, false),
    (v_vhc07, 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80', 2, false),

    (v_vhc08, 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80', 0, true),
    (v_vhc08, 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80', 1, false),
    (v_vhc08, 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80', 2, false),

    (v_vhc09, 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80', 0, true),
    (v_vhc09, 'https://images.unsplash.com/photo-1606611013016-969c19ba27a5?w=800&q=80', 1, false),
    (v_vhc09, 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80', 2, false),

    -- vhc10 (rascunho): sem fotos — testa comportamento do frontend com lista vazia

    (v_vhc11, 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80', 0, true),
    (v_vhc11, 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=800&q=80', 1, false),
    (v_vhc11, 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80', 2, false),

    (v_vhc12, 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80', 0, true),
    (v_vhc12, 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80', 1, false),
    (v_vhc12, 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80', 2, false),

    (v_vhc13, 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80', 0, true),
    (v_vhc13, 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80', 1, false),
    (v_vhc13, 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80', 2, false),

    (v_vhc14, 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80', 0, true),
    (v_vhc14, 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80', 1, false),
    (v_vhc14, 'https://images.unsplash.com/photo-1606611013016-969c19ba27a5?w=800&q=80', 2, false),

    (v_vhc15, 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=800&q=80', 0, true),
    (v_vhc15, 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80', 1, false),
    (v_vhc15, 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80', 2, false),

    (v_vhc16, 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80', 0, true);
    -- vhc16: apenas 1 foto (dados incompletos intencionalmente)
    -- vhc17 (pausado): sem fotos

  -- ============================================================
  -- 8. INSERIR FAVORITOS
  -- ============================================================
  INSERT INTO public.favoritos (user_id, veiculo_id, lista_nome) VALUES
    (v_usr_amanda, v_vhc01, 'Minha lista'),   -- particular
    (v_usr_amanda, v_vhc06, 'Minha lista'),   -- garagem MB
    (v_usr_amanda, v_vhc07, 'Luxo'),
    (v_usr_amanda, v_vhc12, 'Pickups'),        -- garagem AE

    (v_usr_bruno, v_vhc02,  'Minha lista'),   -- particular
    (v_usr_bruno, v_vhc08,  'Minha lista'),   -- garagem MB
    (v_usr_bruno, v_vhc13,  'Pickups e SUVs'),
    (v_usr_bruno, v_vhc14,  'Pickups e SUVs'); -- garagem AE

  -- ============================================================
  -- 9. INSERIR LEADS
  -- ============================================================

  -- Leads para MB Motors (anunciante = Carlos)
  INSERT INTO public.leads (veiculo_id, anunciante_id, garagem_id, nome, telefone, email, mensagem, origem, status) VALUES
    (v_vhc06, v_usr_carlos, v_grg_mb, 'Roberto Mendes',  '(11) 98654-3210', 'roberto@email.com',  'Qual o menor valor à vista?',                   'formulario',  'proposta'),
    (v_vhc07, v_usr_carlos, v_grg_mb, 'Ana Paula Silva', '(11) 99765-4321', 'ana@email.com',      'Gostaria de agendar um test-drive na BMW.',      'agendamento', 'em_contato'),
    (v_vhc07, v_usr_carlos, v_grg_mb, 'Fernanda Costa',  '(11) 97543-2109', 'fernanda@email.com', 'Vi o anúncio da BMW, ainda disponível?',          'whatsapp',    'visita'),
    (v_vhc08, v_usr_carlos, v_grg_mb, 'Diego Rodrigues', '(11) 96432-1098', 'diego@email.com',    'Aceita troca pelo meu Classe A 2020?',            'whatsapp',    'negociacao'),
    (v_vhc08, v_usr_carlos, v_grg_mb, 'Thiago Martins',  '(11) 95321-0987', null,                 'Qual a condição de financiamento?',               'formulario',  'novo');

  -- Leads para Auto Excellence (anunciante = Ricardo)
  INSERT INTO public.leads (veiculo_id, anunciante_id, garagem_id, nome, telefone, email, mensagem, origem, status) VALUES
    (v_vhc12, v_usr_ricardo, v_grg_ae, 'Carlos Eduardo',  '(19) 99876-5432', 'carlos.e@email.com', 'Ainda disponível? Aceita troca?',                 'whatsapp',    'novo'),
    (v_vhc13, v_usr_ricardo, v_grg_ae, 'Pedro Almeida',   '(19) 93109-8765', 'pedro@email.com',    'Gostaria de ver a S10 pessoalmente.',             'agendamento', 'perdido'),
    (v_vhc14, v_usr_ricardo, v_grg_ae, 'Marcos Pereira',  '(19) 95321-0987', 'marcos@email.com',   'Hilux! Aceita consórcio contemplado?',            'whatsapp',    'em_contato'),
    (v_vhc14, v_usr_ricardo, v_grg_ae, 'Juliana Santos',  '(19) 94210-9876', 'juliana@email.com',  'Hilux tem garantia de fábrica ainda?',            'formulario',  'proposta'),
    (v_vhc14, v_usr_ricardo, v_grg_ae, 'Lucas Oliveira',  '(19) 96432-1098', null,                 'Qual o prazo de entrega?',                        'whatsapp',    'novo');

  -- ============================================================
  -- 10. INSERIR BUSCAS SALVAS
  -- ============================================================
  INSERT INTO public.buscas_salvas (user_id, nome, filtros, ativa, frequencia, total_matches) VALUES
    (v_usr_amanda, 'SUV até R$ 150k',
     '{"preco_max": 150000, "km_max": 50000, "cidade": "São Paulo"}'::jsonb,
     true, 'diaria', 14),
    (v_usr_amanda, 'Honda automático',
     '{"marca": "Honda", "cambio": "automatico", "preco_max": 140000}'::jsonb,
     true, 'semanal', 6),
    (v_usr_bruno, 'Pickup Diesel 4x4',
     '{"combustivel": "diesel", "preco_max": 250000, "km_max": 60000}'::jsonb,
     true, 'diaria', 8),
    (v_usr_bruno, 'Compacto SP até R$ 100k',
     '{"preco_max": 100000, "cidade": "São Paulo"}'::jsonb,
     false, 'semanal', 12);

  RAISE NOTICE 'Seed concluído com sucesso!';

END;
$$;
