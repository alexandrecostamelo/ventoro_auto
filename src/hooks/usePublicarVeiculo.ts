import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { comprimirImagem } from '../utils/imageCompression'
import { uploadFotoVeiculo } from '../lib/storage'

export interface DadosNovoVeiculo {
  // Step 1 — dados do veículo
  marca: string
  modelo: string
  versao: string
  ano: string
  quilometragem: string
  combustivel: string
  cambio: string
  cor: string
  potencia: string
  cidade: string
  estado: string
  opcionais: string[]
  condicao: string
  // Step 2 — fotos (fallback mock: URLs; real: File[] passado separadamente)
  fotos: string[]
  // Step 3 — VenStudio IA
  studioProcessed: boolean
  studioCenario: string
  studioMelhorarQualidade: boolean
  // Step 4 — copiloto IA
  titulo: string
  descricao: string
  destaques: string[]
  faq: { pergunta: string; resposta: string }[]
  // Step 5 — preço e documentação
  preco: string
  aceitaTroca: boolean
  ipva_pago: boolean
  revisoes_em_dia: boolean
  sem_sinistro: boolean
  num_chaves: number
  // Step 6 — plano (valores DB: 'basico'|'premium'|'turbo')
  plano: string
}

export interface FotoPublicada {
  id: string
  url_original: string
  ordem: number
}

interface PublicarResult {
  publicar: (
    dados: DadosNovoVeiculo,
    fotoFiles?: File[],
    onProgress?: (n: number, total: number) => void,
  ) => Promise<{ id: string; slug: string; fotos: FotoPublicada[] } | null>
  loading: boolean
  error: Error | null
}

const PLANO_DIAS: Record<string, number> = {
  basico: 30,
  premium: 60,
  turbo: 90,
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function gerarSlug(marca: string, modelo: string, ano: string, cidade: string): string {
  const rand = Math.random().toString(36).slice(2, 6)
  return [normalizar(marca), normalizar(modelo), ano, normalizar(cidade), rand]
    .filter(Boolean)
    .join('-')
}

const CAMPOS_OBRIGATORIOS: (keyof DadosNovoVeiculo)[] = [
  'marca', 'modelo', 'ano', 'quilometragem', 'combustivel', 'cambio', 'cidade', 'estado',
]

export function usePublicarVeiculo(): PublicarResult {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const publicar = async (
    dados: DadosNovoVeiculo,
    fotoFiles?: File[],
    onProgress?: (n: number, total: number) => void,
  ): Promise<{ id: string; slug: string; fotos: FotoPublicada[] } | null> => {
    if (!user || !profile) {
      setError(new Error('Usuário não autenticado'))
      return null
    }

    // Validação de campos obrigatórios
    for (const campo of CAMPOS_OBRIGATORIOS) {
      if (!dados[campo]) {
        setError(new Error(`Campo obrigatório não preenchido: ${campo}`))
        return null
      }
    }
    if (!dados.preco || Number(dados.preco) <= 0) {
      setError(new Error('O preço deve ser maior que zero'))
      return null
    }

    setLoading(true)
    setError(null)

    const tipoAnunciante = profile.tipo === 'garagem' ? 'garagem' : 'particular'
    const garagemId = profile.tipo === 'garagem' ? (profile.garagem_id ?? null) : null

    const agora = new Date()
    const diasPlano = PLANO_DIAS[dados.plano] ?? 30
    const validadeAte = new Date(agora.getTime() + diasPlano * 24 * 60 * 60 * 1000).toISOString()

    // INSERT com até 3 slugs diferentes (colisão de UNIQUE slug é rara mas possível)
    let veiculo: { id: string; slug: string } | null = null
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const slug = gerarSlug(dados.marca, dados.modelo, dados.ano, dados.cidade)

      const { data, error: insertError } = await supabase
        .from('veiculos')
        .insert({
          slug,
          marca: dados.marca,
          modelo: dados.modelo,
          versao: dados.versao || null,
          ano: parseInt(dados.ano, 10),
          quilometragem: parseInt(dados.quilometragem, 10),
          preco: parseFloat(dados.preco),
          combustivel: dados.combustivel as 'flex' | 'gasolina' | 'etanol' | 'diesel' | 'eletrico' | 'hibrido',
          cambio: dados.cambio as 'manual' | 'automatico' | 'cvt',
          cor: dados.cor || null,
          potencia: dados.potencia || null,
          cidade: dados.cidade,
          estado: dados.estado,
          descricao: dados.descricao || null,
          opcionais: dados.opcionais,
          condicao: (dados.condicao || 'bom') as 'excelente' | 'otimo' | 'bom' | 'regular',
          ipva_pago: dados.ipva_pago,
          revisoes_em_dia: dados.revisoes_em_dia,
          sem_sinistro: dados.sem_sinistro,
          num_chaves: dados.num_chaves,
          aceita_troca: dados.aceitaTroca,
          plano: dados.plano as 'basico' | 'premium' | 'turbo',
          destaque: dados.plano === 'premium' || dados.plano === 'turbo',
          status: 'publicado',
          publicado_em: agora.toISOString(),
          validade_ate: validadeAte,
          tipo_anunciante: tipoAnunciante,
          anunciante_id: user.id,
          garagem_id: garagemId,
          selo_studio_ia: dados.studioProcessed,
        })
        .select('id, slug')
        .single()

      if (!insertError) {
        veiculo = data
        break
      }

      // 23505 = unique_violation (slug collision)
      if (insertError.code !== '23505') {
        setError(new Error(insertError.message))
        setLoading(false)
        return null
      }
      if (tentativa === 2) {
        setError(new Error('Não foi possível gerar um identificador único. Tente novamente.'))
        setLoading(false)
        return null
      }
    }

    if (!veiculo) {
      setLoading(false)
      return null
    }

    // ── Upload real de fotos ──────────────────────────────────────────────────
    let fotosPublicadas: FotoPublicada[] = []
    if (fotoFiles && fotoFiles.length > 0) {
      const fotoInserts: Array<{
        veiculo_id: string
        url_original: string
        url_processada: null
        ordem: number
        is_capa: boolean
        processada_por_ia: boolean
      }> = []

      for (let i = 0; i < fotoFiles.length; i++) {
        onProgress?.(i + 1, fotoFiles.length)

        // Comprimir
        let comprimida: File
        try {
          comprimida = await comprimirImagem(fotoFiles[i])
        } catch (compressErr) {
          console.warn(`[usePublicarVeiculo] compressão foto ${i} falhou:`, compressErr)
          continue
        }

        // Upload pro bucket — path: {veiculoId}/{index}.jpg
        const { url, error: uploadError } = await uploadFotoVeiculo(
          veiculo.id,
          comprimida,
          `${i}.jpg`,
        )

        if (!url || uploadError) {
          console.warn(`[usePublicarVeiculo] upload foto ${i} falhou:`, uploadError)
          continue // não aborta — continua com as outras fotos
        }

        fotoInserts.push({
          veiculo_id: veiculo.id,
          url_original: url,
          url_processada: null,
          ordem: i,
          is_capa: i === 0,
          processada_por_ia: false,
        })
      }

      if (fotoInserts.length > 0) {
        const { data: fotosData, error: fotosError } = await supabase
          .from('fotos_veiculo')
          .insert(fotoInserts)
          .select('id, url_original, ordem')
        if (fotosError) {
          console.warn('[usePublicarVeiculo] fotos_veiculo INSERT falhou:', fotosError.message)
        }
        if (fotosData) {
          fotosPublicadas = fotosData
        }
      }

    }

    // ── Salvar conteúdo IA (se gerado pelo copiloto) ──
    if (dados.descricao || dados.destaques.length > 0 || dados.faq.length > 0) {
      const { error: conteudoError } = await supabase.from('conteudo_ia').upsert({
        veiculo_id: veiculo.id,
        titulo: dados.titulo || null,
        descricao: dados.descricao || null,
        highlights: dados.destaques,
        faq: dados.faq,
        sugestoes: [],
      }, { onConflict: 'veiculo_id' })

      if (conteudoError) {
        console.warn('[usePublicarVeiculo] conteudo_ia UPSERT falhou:', conteudoError.message)
      }
    }

    setLoading(false)
    return { ...veiculo, fotos: fotosPublicadas }
  }

  return { publicar, loading, error }
}
