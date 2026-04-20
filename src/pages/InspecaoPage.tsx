import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Camera, Shield, CheckCircle2, AlertTriangle, ChevronLeft, Upload,
  X, Loader2, Eye, ArrowRight, Info,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { validarArquivoImagem } from '@/utils/imageCompression'
import { comprimirImagem } from '@/utils/imageCompression'
import { uploadFotoVeiculo } from '@/lib/storage'

// ── Ângulos guiados ─────────────────────────────────────────────────────

const ANGULOS_GUIA = [
  { id: 'frente', label: 'Frente', desc: 'Vista frontal completa do veículo', icon: '🚗' },
  { id: 'traseira', label: 'Traseira', desc: 'Vista traseira completa', icon: '🔙' },
  { id: 'lateral_esquerda', label: 'Lateral esquerda', desc: 'Lado do motorista, veículo inteiro', icon: '⬅️' },
  { id: 'lateral_direita', label: 'Lateral direita', desc: 'Lado do passageiro, veículo inteiro', icon: '➡️' },
  { id: 'painel', label: 'Painel / Interior', desc: 'Painel, volante e bancos dianteiros', icon: '🎛️' },
  { id: 'motor', label: 'Motor', desc: 'Capô aberto, motor visível', icon: '⚙️' },
  { id: 'pneu_dianteiro', label: 'Pneu dianteiro', desc: 'Close no pneu dianteiro esquerdo', icon: '🛞' },
  { id: 'pneu_traseiro', label: 'Pneu traseiro', desc: 'Close no pneu traseiro direito', icon: '🛞' },
] as const

type AnguloId = typeof ANGULOS_GUIA[number]['id']

interface FotoGuiada {
  angulo: AnguloId
  file: File | null
  preview: string | null
  url: string | null // URL após upload
}

// ── Tipos de resultado ──────────────────────────────────────────────────

interface DanoDetectado {
  tipo: string
  regiao: string
  severidade: 'leve' | 'moderado' | 'grave'
  descricao: string
  foto_angulo: string
  confianca: number
}

interface ResultadoInspecao {
  id: string
  score_condicao: number
  danos: DanoDetectado[]
  resumo: string
  detalhes_por_angulo: Record<string, { status: string; observacoes: string }>
  fotos_count: number
  tempo_ms: number
}

// ── Severidade visual ───────────────────────────────────────────────────

const SEVERIDADE_CONFIG = {
  leve: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', label: 'Leve' },
  moderado: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', label: 'Moderado' },
  grave: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', label: 'Grave' },
}

// ── Componente principal ────────────────────────────────────────────────

export default function InspecaoPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [fase, setFase] = useState<'loading' | 'fotos' | 'processando' | 'resultado'>('loading')
  const [veiculo, setVeiculo] = useState<{
    id: string; marca: string; modelo: string; versao: string | null; ano: number; slug: string
  } | null>(null)
  const [fotos, setFotos] = useState<FotoGuiada[]>(
    ANGULOS_GUIA.map(a => ({ angulo: a.id, file: null, preview: null, url: null }))
  )
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoInspecao | null>(null)
  const [resultadoExistente, setResultadoExistente] = useState<boolean>(false)

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // ── Auth guard + carregar veículo ──
  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/entrar'); return }
    if (!slug) return

    const carregarVeiculo = async () => {
      const { data, error: err } = await supabase
        .from('veiculos')
        .select('id, marca, modelo, versao, ano, slug, anunciante_id')
        .eq('slug', slug)
        .single()

      if (err || !data) {
        setError('Veículo não encontrado')
        setFase('fotos')
        return
      }

      if (data.anunciante_id !== user.id) {
        setError('Você não tem permissão para inspecionar este veículo')
        setFase('fotos')
        return
      }

      setVeiculo(data)

      // Verificar inspeção existente
      const { data: inspecao } = await supabase
        .from('inspecao_visual')
        .select('id, score_condicao, danos, resumo, fotos_inspecao, tempo_ms')
        .eq('veiculo_id', data.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (inspecao) {
        setResultado({
          id: inspecao.id,
          score_condicao: inspecao.score_condicao,
          danos: (inspecao.danos as DanoDetectado[]) || [],
          resumo: inspecao.resumo || '',
          detalhes_por_angulo: {},
          fotos_count: Array.isArray(inspecao.fotos_inspecao) ? inspecao.fotos_inspecao.length : 0,
          tempo_ms: inspecao.tempo_ms || 0,
        })
        setResultadoExistente(true)
        setFase('resultado')
      } else {
        setFase('fotos')
      }
    }

    carregarVeiculo()
  }, [user, authLoading, slug, navigate])

  // ── Handlers de foto ──

  const handleFotoAdded = (angulo: AnguloId, file: File) => {
    const erro = validarArquivoImagem(file)
    if (erro) { setError(erro); return }
    setError(null)

    const preview = URL.createObjectURL(file)
    setFotos(prev => prev.map(f =>
      f.angulo === angulo ? { ...f, file, preview } : f
    ))
  }

  const removeFoto = (angulo: AnguloId) => {
    setFotos(prev => prev.map(f => {
      if (f.angulo === angulo) {
        if (f.preview) URL.revokeObjectURL(f.preview)
        return { ...f, file: null, preview: null, url: null }
      }
      return f
    }))
  }

  const fotosPreenchidas = fotos.filter(f => f.file !== null)
  const podeProsseguir = fotosPreenchidas.length >= 4

  // ── Iniciar inspeção ──

  const iniciarInspecao = async () => {
    if (!veiculo || !podeProsseguir) return
    setFase('processando')
    setError(null)
    setUploadProgress(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      // 1. Upload das fotos
      const fotosComUrl: Array<{ url: string; angulo: string }> = []

      for (let i = 0; i < fotosPreenchidas.length; i++) {
        const f = fotosPreenchidas[i]
        setUploadProgress(`Enviando foto ${i + 1}/${fotosPreenchidas.length} (${f.angulo.replace(/_/g, ' ')})…`)

        let comprimida: File
        try {
          comprimida = await comprimirImagem(f.file!)
        } catch {
          comprimida = f.file!
        }

        const { url, error: uploadErr } = await uploadFotoVeiculo(
          veiculo.id,
          comprimida,
          `inspecao-${f.angulo}.jpg`,
        )

        if (!url || uploadErr) {
          console.warn(`[Inspeção] Upload falhou: ${f.angulo}`, uploadErr)
          continue
        }

        fotosComUrl.push({ url, angulo: f.angulo })
      }

      if (fotosComUrl.length < 4) {
        throw new Error('Não foi possível enviar fotos suficientes (mín. 4)')
      }

      // 2. Chamar Edge Function
      setUploadProgress('Analisando fotos com IA…')

      const { data, error: fnError } = await supabase.functions.invoke('inspecionar-veiculo', {
        body: { veiculo_id: veiculo.id, fotos: fotosComUrl },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)

      setResultado(data as ResultadoInspecao)
      setFase('resultado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar inspeção')
      setFase('fotos')
    }
  }

  const novaInspecao = () => {
    setResultado(null)
    setResultadoExistente(false)
    setFotos(ANGULOS_GUIA.map(a => ({ angulo: a.id, file: null, preview: null, url: null })))
    setFase('fotos')
  }

  if (authLoading || fase === 'loading') return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 container mx-auto px-4 max-w-4xl pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-secondary rounded-lg transition-colors">
            <ChevronLeft className="h-5 w-5 text-text-muted" />
          </button>
          <div>
            <h1 className="text-h2 text-text-primary flex items-center gap-2">
              <Shield className="h-6 w-6 text-brand" />
              Inspeção Visual IA
            </h1>
            {veiculo && (
              <p className="text-small text-text-muted mt-0.5">
                {veiculo.marca} {veiculo.modelo} {veiculo.versao || ''} {veiculo.ano}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-small text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* ── FASE: Fotos guiadas ── */}
        {fase === 'fotos' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-brand/20 bg-brand-light p-4 flex gap-3">
              <Info className="h-5 w-5 text-brand flex-shrink-0 mt-0.5" />
              <div className="text-small text-text-secondary">
                <p className="font-medium text-text-primary">Como funciona</p>
                <p className="mt-1">
                  Tire fotos de pelo menos 4 ângulos diferentes do veículo. A IA analisará cada foto
                  para detectar riscos, amassados, diferenças de pintura e outros danos visíveis.
                  Quanto mais fotos, mais precisa a inspeção.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ANGULOS_GUIA.map((angulo) => {
                const foto = fotos.find(f => f.angulo === angulo.id)!
                const temFoto = foto.file !== null

                return (
                  <div
                    key={angulo.id}
                    className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                      temFoto
                        ? 'border-brand shadow-md'
                        : 'border-dashed border-border hover:border-brand/50'
                    }`}
                  >
                    <input
                      ref={el => { inputRefs.current[angulo.id] = el }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFotoAdded(angulo.id, file)
                        e.target.value = ''
                      }}
                    />

                    {temFoto ? (
                      <>
                        <img
                          src={foto.preview!}
                          alt={angulo.label}
                          className="w-full aspect-[4/3] object-cover"
                        />
                        <button
                          onClick={() => removeFoto(angulo.id)}
                          className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-brand/90 px-2 py-1">
                          <p className="text-micro text-white font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {angulo.label}
                          </p>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => inputRefs.current[angulo.id]?.click()}
                        className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-1.5 p-3 text-center hover:bg-surface-secondary/50 transition-colors"
                      >
                        <span className="text-2xl">{angulo.icon}</span>
                        <p className="text-micro font-medium text-text-primary">{angulo.label}</p>
                        <p className="text-[10px] text-text-muted leading-tight">{angulo.desc}</p>
                        <Camera className="h-4 w-4 text-text-muted mt-1" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Contador + botão */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-small text-text-muted">
                {fotosPreenchidas.length}/{ANGULOS_GUIA.length} fotos
                {fotosPreenchidas.length < 4 && (
                  <span className="text-amber-600 dark:text-amber-400"> (mínimo 4)</span>
                )}
              </p>
              <button
                onClick={iniciarInspecao}
                disabled={!podeProsseguir}
                className="inline-flex items-center gap-2 rounded-full bg-brand text-primary-foreground px-6 py-2.5 text-body font-medium hover:brightness-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Shield className="h-4 w-4" />
                Iniciar inspeção
              </button>
            </div>
          </div>
        )}

        {/* ── FASE: Processando ── */}
        {fase === 'processando' && (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            >
              <Shield className="h-16 w-16 text-brand" />
            </motion.div>
            <div className="text-center">
              <h2 className="text-h3 text-text-primary mb-2">Inspeção em andamento</h2>
              <p className="text-body text-text-secondary">{uploadProgress || 'Processando...'}</p>
              <p className="text-small text-text-muted mt-2">
                Isso pode levar de 30 segundos a 2 minutos dependendo da quantidade de fotos.
              </p>
            </div>
            <div className="flex gap-1">
              {fotosPreenchidas.map((_, i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 rounded-full bg-brand"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── FASE: Resultado ── */}
        {fase === 'resultado' && resultado && (
          <div className="space-y-6">
            {resultadoExistente && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center justify-between">
                <p className="text-small text-amber-700 dark:text-amber-300">
                  Este veículo já possui uma inspeção. Veja o resultado abaixo ou faça uma nova.
                </p>
                <button
                  onClick={novaInspecao}
                  className="text-small font-medium text-brand hover:text-brand-dark transition-colors flex-shrink-0 ml-3"
                >
                  Nova inspeção
                </button>
              </div>
            )}

            {/* Score card */}
            <div className="rounded-2xl border border-border bg-surface-card p-8 text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 mb-4 relative"
                style={{
                  borderColor: resultado.score_condicao >= 80 ? '#16a34a'
                    : resultado.score_condicao >= 60 ? '#d97706' : '#dc2626',
                }}
              >
                <div>
                  <p className="text-4xl font-bold text-text-primary font-[family-name:var(--font-mono)]">
                    {resultado.score_condicao}
                  </p>
                  <p className="text-micro text-text-muted uppercase">Score</p>
                </div>
              </div>
              <h2 className="text-h3 text-text-primary">
                {resultado.score_condicao >= 90 ? 'Excelente estado'
                  : resultado.score_condicao >= 75 ? 'Bom estado'
                  : resultado.score_condicao >= 60 ? 'Estado razoável'
                  : 'Atenção necessária'
                }
              </h2>
              <p className="text-body text-text-secondary mt-2 max-w-lg mx-auto">
                {resultado.resumo}
              </p>
              <div className="flex justify-center gap-6 mt-4 text-small text-text-muted">
                <span>{resultado.danos.length} dano(s) detectado(s)</span>
                <span>{resultado.fotos_count} fotos analisadas</span>
                <span>{(resultado.tempo_ms / 1000).toFixed(1)}s</span>
              </div>
            </div>

            {/* Mapa visual simplificado */}
            <div className="rounded-xl border border-border bg-surface-card p-6">
              <h3 className="text-h4 text-text-primary mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-brand" />
                Mapa de condição
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ANGULOS_GUIA.map((angulo) => {
                  const danosAngulo = resultado.danos.filter(d => d.foto_angulo === angulo.id)
                  const temDano = danosAngulo.length > 0
                  const piorSeveridade = danosAngulo.reduce<'leve' | 'moderado' | 'grave' | null>(
                    (pior, d) => {
                      if (!pior) return d.severidade
                      const ordem = { leve: 0, moderado: 1, grave: 2 }
                      return ordem[d.severidade] > ordem[pior] ? d.severidade : pior
                    },
                    null
                  )
                  const config = piorSeveridade ? SEVERIDADE_CONFIG[piorSeveridade] : null

                  return (
                    <div
                      key={angulo.id}
                      className={`rounded-lg border p-3 text-center ${
                        temDano
                          ? `${config!.bg} ${config!.border}`
                          : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      }`}
                    >
                      <span className="text-xl">{angulo.icon}</span>
                      <p className="text-micro font-medium text-text-primary mt-1">{angulo.label}</p>
                      {temDano ? (
                        <p className={`text-micro font-medium mt-0.5 ${config!.color}`}>
                          {danosAngulo.length} dano(s)
                        </p>
                      ) : (
                        <p className="text-micro font-medium text-green-600 dark:text-green-400 mt-0.5">OK</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Lista de danos */}
            {resultado.danos.length > 0 && (
              <div className="rounded-xl border border-border bg-surface-card p-6">
                <h3 className="text-h4 text-text-primary mb-4">Danos detectados</h3>
                <div className="space-y-3">
                  {resultado.danos.map((dano, i) => {
                    const config = SEVERIDADE_CONFIG[dano.severidade]
                    return (
                      <div key={i} className={`rounded-lg border p-4 ${config.bg} ${config.border}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-small font-semibold capitalize ${config.color}`}>
                              {dano.tipo.replace(/_/g, ' ')}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-micro font-medium ${config.bg} ${config.color} border ${config.border}`}>
                              {config.label}
                            </span>
                          </div>
                          <span className="text-micro text-text-muted">
                            {Math.round(dano.confianca * 100)}% confiança
                          </span>
                        </div>
                        <p className="text-small text-text-secondary">{dano.descricao}</p>
                        <p className="text-micro text-text-muted mt-1">
                          Região: {dano.regiao.replace(/_/g, ' ')} · Foto: {dano.foto_angulo.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sem danos */}
            {resultado.danos.length === 0 && (
              <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                <h3 className="text-h4 text-text-primary">Nenhum dano detectado</h3>
                <p className="text-body text-text-secondary mt-1">
                  O veículo aparenta estar em excelente estado visual nas fotos analisadas.
                </p>
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              {veiculo && (
                <Link
                  to={`/veiculo/${veiculo.slug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand text-primary-foreground px-6 py-2.5 text-body font-medium hover:brightness-90 transition-all"
                >
                  Ver anúncio <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <button
                onClick={() => navigate('/minha-conta/anuncios')}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-2.5 text-body font-medium text-text-primary hover:bg-surface-secondary transition-colors"
              >
                Voltar aos anúncios
              </button>
              {!resultadoExistente && (
                <button
                  onClick={novaInspecao}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-2.5 text-body font-medium text-text-primary hover:bg-surface-secondary transition-colors"
                >
                  Nova inspeção
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
