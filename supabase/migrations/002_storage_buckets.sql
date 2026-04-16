-- ============================================================
-- MIGRAÇÃO 002: Storage Buckets com RLS completo
-- Idempotente: seguro reexecutar mesmo se 001 já criou os buckets
-- ============================================================

-- ============================================================
-- BUCKETS
-- ON CONFLICT atualiza limites e MIME types sem erro de duplicata
-- ============================================================

-- 1. fotos-veiculos — 5MB, sem SVG
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotos-veiculos',
  'fotos-veiculos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. logos-garagens — 1MB, aceita SVG
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos-garagens',
  'logos-garagens',
  true,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. capas-garagens — 3MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'capas-garagens',
  'capas-garagens',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4. avatares — 1MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatares',
  'avatares',
  true,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- LIMPEZA: remover políticas incompletas criadas pela migração 001
-- ============================================================
DROP POLICY IF EXISTS "Fotos de veículos são públicas"      ON storage.objects;
DROP POLICY IF EXISTS "Usuário autenticado faz upload de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Usuário deleta suas próprias fotos"  ON storage.objects;

-- ============================================================
-- BUCKET: fotos-veiculos
-- Estrutura de path: {veiculo_id}/{nome_arquivo}
-- Dono: veiculos.anunciante_id === auth.uid()
-- ============================================================

-- SELECT: qualquer pessoa vê fotos publicadas
DROP POLICY IF EXISTS "fotos_veiculos_select" ON storage.objects;
CREATE POLICY "fotos_veiculos_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-veiculos');

-- INSERT: apenas o anunciante dono do veículo
DROP POLICY IF EXISTS "fotos_veiculos_insert" ON storage.objects;
CREATE POLICY "fotos_veiculos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fotos-veiculos'
    AND auth.role() = 'authenticated'
    AND auth.uid() = (
      SELECT anunciante_id
      FROM public.veiculos
      WHERE id = (storage.foldername(name))[1]::uuid
    )
  );

-- UPDATE: apenas o anunciante dono do veículo
DROP POLICY IF EXISTS "fotos_veiculos_update" ON storage.objects;
CREATE POLICY "fotos_veiculos_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'fotos-veiculos'
    AND auth.uid() = (
      SELECT anunciante_id
      FROM public.veiculos
      WHERE id = (storage.foldername(name))[1]::uuid
    )
  );

-- DELETE: apenas o anunciante dono do veículo
DROP POLICY IF EXISTS "fotos_veiculos_delete" ON storage.objects;
CREATE POLICY "fotos_veiculos_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fotos-veiculos'
    AND auth.uid() = (
      SELECT anunciante_id
      FROM public.veiculos
      WHERE id = (storage.foldername(name))[1]::uuid
    )
  );

-- ============================================================
-- BUCKET: logos-garagens
-- Estrutura de path: {garagem_id}/logo.{ext}
-- Dono: qualquer profiles.id onde profiles.garagem_id = {garagem_id}
-- (garagens não tem owner_id — ownership é via profiles.garagem_id)
-- ============================================================

-- SELECT: público
DROP POLICY IF EXISTS "logos_garagens_select" ON storage.objects;
CREATE POLICY "logos_garagens_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos-garagens');

-- INSERT: membro da garagem
DROP POLICY IF EXISTS "logos_garagens_insert" ON storage.objects;
CREATE POLICY "logos_garagens_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos-garagens'
    AND auth.role() = 'authenticated'
    AND auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE garagem_id = (storage.foldername(name))[1]::uuid
    )
  );

-- UPDATE: membro da garagem
DROP POLICY IF EXISTS "logos_garagens_update" ON storage.objects;
CREATE POLICY "logos_garagens_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos-garagens'
    AND auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE garagem_id = (storage.foldername(name))[1]::uuid
    )
  );

-- DELETE: membro da garagem
DROP POLICY IF EXISTS "logos_garagens_delete" ON storage.objects;
CREATE POLICY "logos_garagens_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos-garagens'
    AND auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE garagem_id = (storage.foldername(name))[1]::uuid
    )
  );

-- ============================================================
-- BUCKET: capas-garagens
-- Estrutura de path: {garagem_id}/capa.{ext}
-- RLS: idêntico a logos-garagens
-- ============================================================

DROP POLICY IF EXISTS "capas_garagens_select" ON storage.objects;
CREATE POLICY "capas_garagens_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'capas-garagens');

DROP POLICY IF EXISTS "capas_garagens_insert" ON storage.objects;
CREATE POLICY "capas_garagens_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'capas-garagens'
    AND auth.role() = 'authenticated'
    AND auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE garagem_id = (storage.foldername(name))[1]::uuid
    )
  );

DROP POLICY IF EXISTS "capas_garagens_update" ON storage.objects;
CREATE POLICY "capas_garagens_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'capas-garagens'
    AND auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE garagem_id = (storage.foldername(name))[1]::uuid
    )
  );

DROP POLICY IF EXISTS "capas_garagens_delete" ON storage.objects;
CREATE POLICY "capas_garagens_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'capas-garagens'
    AND auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE garagem_id = (storage.foldername(name))[1]::uuid
    )
  );

-- ============================================================
-- BUCKET: avatares
-- Estrutura de path: {user_id}/avatar.{ext}
-- Dono: auth.uid() === primeiro segmento do path
-- ============================================================

DROP POLICY IF EXISTS "avatares_select" ON storage.objects;
CREATE POLICY "avatares_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatares');

DROP POLICY IF EXISTS "avatares_insert" ON storage.objects;
CREATE POLICY "avatares_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatares'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatares_update" ON storage.objects;
CREATE POLICY "avatares_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatares'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatares_delete" ON storage.objects;
CREATE POLICY "avatares_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatares'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
