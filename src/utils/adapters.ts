import type { Database } from '@/types/database.types'
import type { Vehicle } from '@/types/vehicle'

type FotoVeiculo = {
  url_original: string
  url_processada: string | null
  is_capa: boolean
  ordem: number
}

export type VeiculoComFotos = Database['public']['Tables']['veiculos']['Row'] & {
  fotos_veiculo: FotoVeiculo[]
}

// Tipo completo para a página de detalhe (inclui todos os JOINs)
export type VeiculoDetalhe = Database['public']['Tables']['veiculos']['Row'] & {
  fotos_veiculo: Database['public']['Tables']['fotos_veiculo']['Row'][]
  conteudo_ia: Database['public']['Tables']['conteudo_ia']['Row'][] | null
  historico_preco: Database['public']['Tables']['historico_preco']['Row'][] | null
  inspecao_visual: Database['public']['Tables']['inspecao_visual']['Row'][] | null
  profiles: Database['public']['Tables']['profiles']['Row'] | null
  garagens: Database['public']['Tables']['garagens']['Row'] | null
}

const PLACEHOLDER = '/placeholder-car.jpg'

export function veiculoDbParaMock(v: VeiculoComFotos): Vehicle {
  const fotos = (v.fotos_veiculo ?? [])
    .sort((a, b) => {
      if (a.is_capa !== b.is_capa) return a.is_capa ? -1 : 1
      return a.ordem - b.ordem
    })
    .map((f) => f.url_processada ?? f.url_original)

  return {
    id: v.id,
    slug: v.slug,
    marca: v.marca,
    modelo: v.modelo,
    versao: v.versao ?? '',
    ano: v.ano,
    quilometragem: v.quilometragem,
    preco: v.preco,
    combustivel: v.combustivel,
    cambio: v.cambio,
    cor: v.cor ?? '',
    potencia: v.potencia ?? '',
    torque: v.torque ?? undefined,
    consumo_cidade: v.consumo_cidade ?? undefined,
    consumo_estrada: v.consumo_estrada ?? undefined,
    cidade: v.cidade,
    estado: v.estado,
    fotos: fotos.length > 0 ? fotos : [PLACEHOLDER],
    score_confianca: v.score_confianca,
    preco_status: v.preco_status,
    preco_sugerido: {
      min: v.preco_sugerido_min ?? 0,
      max: v.preco_sugerido_max ?? 0,
    },
    descricao: v.descricao ?? '',
    opcionais: v.opcionais,
    tipo_anunciante: v.tipo_anunciante,
    garagem_id: v.garagem_id ?? undefined,
    selo_studio_ia: v.selo_studio_ia,
    selo_video_ia: v.selo_video_ia,
    selo_inspecao: v.selo_inspecao,
    destaque: v.destaque,
    data_publicacao: v.publicado_em ?? v.created_at,
    visualizacoes: v.visualizacoes,
    favoritos_count: v.favoritos_count,
    leads_count: v.leads_count,
  }
}
