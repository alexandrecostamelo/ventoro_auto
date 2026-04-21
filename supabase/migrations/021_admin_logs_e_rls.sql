-- ============================================================
-- Admin: Tabela de logs de auditoria + RLS admin
-- ============================================================

-- Tabela de logs de ações administrativas
CREATE TABLE IF NOT EXISTS logs_admin (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  acao text NOT NULL,                    -- criar, atualizar, deletar, verificar, cancelar
  entidade text NOT NULL,                -- profiles, garagens, assinaturas, etc.
  entidade_id text,                      -- ID do registro afetado
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  admin_email text,
  detalhes jsonb,                        -- dados extras da ação
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_logs_admin_created ON logs_admin (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_admin_entidade ON logs_admin (entidade, created_at DESC);

-- RLS: admins veem todos os logs, outros não veem nada
ALTER TABLE logs_admin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_logs" ON logs_admin
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tipo = 'admin'
    )
  );

CREATE POLICY "admins_insert_logs" ON logs_admin
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tipo = 'admin'
    )
  );

-- ============================================================
-- RLS policies para admin em tabelas existentes
-- Permite que admins leiam TODOS os registros (sem filtro por user)
-- ============================================================

-- profiles: admin pode ler e atualizar qualquer profile
CREATE POLICY "admin_read_all_profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.tipo = 'admin')
  );

CREATE POLICY "admin_update_all_profiles" ON profiles
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.tipo = 'admin')
  );

-- garagens: admin pode ler e atualizar qualquer garagem
CREATE POLICY "admin_read_all_garagens" ON garagens
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tipo = 'admin')
  );

CREATE POLICY "admin_update_all_garagens" ON garagens
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tipo = 'admin')
  );

-- assinaturas: admin pode ler e atualizar qualquer assinatura
CREATE POLICY "admin_read_all_assinaturas" ON assinaturas
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tipo = 'admin')
  );

CREATE POLICY "admin_update_all_assinaturas" ON assinaturas
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tipo = 'admin')
  );

-- pagamentos: admin pode ler todos os pagamentos
CREATE POLICY "admin_read_all_pagamentos" ON pagamentos
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tipo = 'admin')
  );

-- veiculos: admin pode ler e atualizar qualquer veículo
CREATE POLICY "admin_read_all_veiculos" ON veiculos
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tipo = 'admin')
  );

CREATE POLICY "admin_update_all_veiculos" ON veiculos
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tipo = 'admin')
  );

-- leads: admin pode ler todos os leads
CREATE POLICY "admin_read_all_leads" ON leads
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tipo = 'admin')
  );

-- processamentos_ia: admin pode ler todos
CREATE POLICY "admin_read_all_processamentos" ON processamentos_ia
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tipo = 'admin')
  );

-- uso_ia: admin pode ler todos
CREATE POLICY "admin_read_all_uso_ia" ON uso_ia
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tipo = 'admin')
  );
