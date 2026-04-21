-- VenStudio V2: buckets para processamento

-- Bucket privado para PNGs intermediários (segmentação)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('processamento-ia', 'processamento-ia', false, 10485760, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Bucket público para fundos pré-gerados
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('fundos-cenarios', 'fundos-cenarios', true, 5242880, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- RLS: fundos-cenarios — leitura pública
CREATE POLICY IF NOT EXISTS "fundos_cenarios_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'fundos-cenarios');
