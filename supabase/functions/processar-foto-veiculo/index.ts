import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

// ============================================================
// V1 DEPRECADO — Pipeline migrado para VenStudio V2
// Segmentação: supabase/functions/segmentar-veiculo
// Composição:  api/venstudio/compor-base | compor-premium
// ============================================================

serve((_req) => {
  return new Response(
    JSON.stringify({
      error: 'Pipeline V1 descontinuado. Use VenStudio V2.',
      migration: 'segmentar-veiculo + compor-base/compor-premium',
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    },
  )
})
