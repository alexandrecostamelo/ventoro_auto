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
  // Step 4 — descrição
  descricao: string
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

interface PublicarResult {
  publicar: (
    dados: DadosNovoVeiculo,
    fotoFiles?: File[],
    onProgress?: (n: number, total: number) => void,
  ) => Promise<{ id: string; slug: string } | null>
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
  ): Promise<{ id: string; slug: string } | null> => {
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
        const { error: fotosError } = await supabase.from('fotos_veiculo').insert(fotoInserts)
        if (fotosError) {
          console.warn('[usePublicarVeiculo] fotos_veiculo INSERT falhou:', fotosError.message)
        }
      }

    } else if (dados.fotos.length > 0) {
      // Fallback: URLs mock/demo (caminho USE_REAL_DATA=false ou fotos de demonstração)
      const fotoInserts = dados.fotos.map((url, idx) => ({
        veiculo_id: veiculo!.id,
        url_original: url,
        url_processada: null,
        ordem: idx,
        is_capa: idx === 0,
        processada_por_ia: false,
      }))
      const { error: fotosError } = await supabase.from('fotos_veiculo').insert(fotoInserts)
      if (fotosError) {
        console.warn('[usePublicarVeiculo] fotos_veiculo INSERT falhou (mock):', fotosError.message)
      }
    }

    setLoading(false)
    return veiculo
  }

  return { publicar, loading, error }
}
