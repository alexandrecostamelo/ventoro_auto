const EDGE_FUNCTION_URL =
  'https://flhrbrnuwkpcdsnplibo.supabase.co/functions/v1/incrementar-visualizacoes'

/**
 * Incrementa o contador de visualizações de um veículo via Edge Function.
 * Falha silenciosamente — nunca deve quebrar a página de detalhe do veículo.
 * Retorna o novo total ou null em caso de erro/rate limit.
 */
export async function incrementarVisualizacao(
  veiculoId: string,
): Promise<{ total: number } | null> {
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ veiculo_id: veiculoId }),
    })

    if (!res.ok) return null

    const data = await res.json()
    return { total: data.total_visualizacoes }
  } catch {
    return null
  }
}
