-- Migração 007: Policy SELECT em visualizacoes_diarias para gestores de garagem
-- Permite que qualquer profile com garagem_id leia os snapshots dos seus veículos.
-- INSERT/UPDATE permanecem exclusivos ao service_role (via RPC SECURITY DEFINER).

CREATE POLICY "garagem_select_visualizacoes_diarias"
ON visualizacoes_diarias
FOR SELECT
USING (
  veiculo_id IN (
    SELECT v.id
    FROM veiculos v
    JOIN profiles p ON p.garagem_id = v.garagem_id
    WHERE p.id = auth.uid()
      AND v.tipo_anunciante = 'garagem'
  )
);
