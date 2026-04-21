-- ============================================================
-- Fix: Recursão infinita na RLS de profiles
-- A policy admin_read_all_profiles fazia SELECT em profiles
-- para verificar se o user é admin, causando loop infinito.
-- Solução: criar função SECURITY DEFINER que bypassa RLS.
-- ============================================================

-- Função auxiliar que verifica se o usuário é admin sem passar por RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND tipo = 'admin'
  );
$$;

-- Dropar policies admin que causam recursão em profiles
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;

-- Recriar usando is_admin()
CREATE POLICY "admin_read_all_profiles" ON profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "admin_update_all_profiles" ON profiles
  FOR UPDATE USING (is_admin());

-- Atualizar policies admin nas outras tabelas também (usar is_admin() por consistência)
DROP POLICY IF EXISTS "admin_read_all_garagens" ON garagens;
DROP POLICY IF EXISTS "admin_update_all_garagens" ON garagens;
CREATE POLICY "admin_read_all_garagens" ON garagens FOR SELECT USING (is_admin());
CREATE POLICY "admin_update_all_garagens" ON garagens FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "admin_read_all_assinaturas" ON assinaturas;
DROP POLICY IF EXISTS "admin_update_all_assinaturas" ON assinaturas;
CREATE POLICY "admin_read_all_assinaturas" ON assinaturas FOR SELECT USING (is_admin());
CREATE POLICY "admin_update_all_assinaturas" ON assinaturas FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "admin_read_all_pagamentos" ON pagamentos;
CREATE POLICY "admin_read_all_pagamentos" ON pagamentos FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "admin_read_all_veiculos" ON veiculos;
DROP POLICY IF EXISTS "admin_update_all_veiculos" ON veiculos;
CREATE POLICY "admin_read_all_veiculos" ON veiculos FOR SELECT USING (is_admin());
CREATE POLICY "admin_update_all_veiculos" ON veiculos FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "admin_read_all_leads" ON leads;
CREATE POLICY "admin_read_all_leads" ON leads FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "admin_read_all_processamentos" ON processamentos_ia;
CREATE POLICY "admin_read_all_processamentos" ON processamentos_ia FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "admin_read_all_uso_ia" ON uso_ia;
CREATE POLICY "admin_read_all_uso_ia" ON uso_ia FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "admins_read_logs" ON logs_admin;
DROP POLICY IF EXISTS "admins_insert_logs" ON logs_admin;
CREATE POLICY "admins_read_logs" ON logs_admin FOR SELECT USING (is_admin());
CREATE POLICY "admins_insert_logs" ON logs_admin FOR INSERT WITH CHECK (is_admin());
