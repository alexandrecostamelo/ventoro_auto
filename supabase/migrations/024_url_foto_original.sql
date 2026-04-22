-- Coluna para armazenar URL da foto original para processamento async
ALTER TABLE processamentos_ia ADD COLUMN IF NOT EXISTS url_foto_original text;
