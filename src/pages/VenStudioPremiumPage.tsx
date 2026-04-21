import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronLeft, ArrowRight, Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { useVeiculosAnunciante, fotoCapa, type VeiculoAnunciante } from '@/hooks/useVeiculosAnunciante'
import { useVenStudioPremium, type PremiumState } from '@/hooks/useVenStudioPremium'
import { UploadArea } from '@/components/venstudio/UploadArea'
import { StyleSelector } from '@/components/venstudio/StyleSelector'
import { ProcessingStatus } from '@/components/venstudio/ProcessingStatus'
import { ResultViewer, ResultError } from '@/components/venstudio/ResultViewer'
import { PRESETS } from '@/lib/venstudio-presets-v2'
import { supabase } from '@/lib/supabase'

interface FotoVeiculo {
  id: string
  url_original: string
  url_processada: string | null
  ordem: number
  is_capa: boolean
}

export default function VenStudioPremiumPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { veiculos, loading: veiculosLoading } = useVeiculosAnunciante()
  const premium = useVenStudioPremium()

  const [selectedVeiculo, setSelectedVeiculo] = useState<VeiculoAnunciante | null>(null)
  const [fotosVeiculo, setFotosVeiculo] = useState<FotoVeiculo[]>([])
  const [selectedFoto, setSelectedFoto] = useState<FotoVeiculo | null>(null)
  const [loadingFotos, setLoadingFotos] = useState(false)
  const [pngUrl, setPngUrl] = useState<string | null>(null)
  const [processStartedAt, setProcessStartedAt] = useState<number | null>(null)

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate('/entrar')
  }, [user, authLoading, navigate])

  // Load vehicle photos
  const handleSelectVeiculo = async (v: VeiculoAnunciante) => {
    setSelectedVeiculo(v)
    setLoadingFotos(true)

    const { data } = await supabase
      .from('fotos_veiculo')
      .select('id, url_original, url_processada, ordem, is_capa')
      .eq('veiculo_id', v.id)
      .order('ordem')

    const fotos = (data ?? []) as FotoVeiculo[]
    setFotosVeiculo(fotos)
    setLoadingFotos(false)
  }

  const handleSelectFoto = (foto: FotoVeiculo) => {
    setSelectedFoto(foto)
    // Use original URL as preview and find PNG segmented version
    const segUrl = foto.url_original.replace('/fotos-veiculos/', '/fotos-veiculos/segmentado/')
      .replace(/\.(jpg|jpeg|png|webp)$/i, '.png')
    setPngUrl(segUrl)
    // Set file with a dummy to trigger state change to 'selecting'
    premium.setFile(new File([], 'foto.jpg'))
  }

  const handleStartProcessing = async () => {
    if (!selectedVeiculo || !selectedFoto || !pngUrl) return
    setProcessStartedAt(Date.now())
    await premium.startProcessing(
      selectedVeiculo.id,
      pngUrl,
      selectedFoto.url_original,
      selectedFoto.id
    )
  }

  const handleChangeStyle = () => {
    premium.reset()
    if (selectedFoto) {
      premium.setFile(new File([], 'foto.jpg'))
    }
  }

  const handleBack = () => {
    if (premium.state !== 'idle' && premium.state !== 'selecting') {
      premium.reset()
      if (selectedFoto) {
        premium.setFile(new File([], 'foto.jpg'))
      }
      return
    }
    if (selectedFoto) {
      setSelectedFoto(null)
      setPngUrl(null)
      premium.reset()
      return
    }
    if (selectedVeiculo) {
      setSelectedVeiculo(null)
      setFotosVeiculo([])
      return
    }
    navigate(-1)
  }

  // Phase label
  const phaseLabel = (s: PremiumState) => {
    switch (s) {
      case 'idle': return selectedVeiculo ? 'Escolha uma foto' : 'Escolha um veículo'
      case 'selecting': return 'Escolha o ambiente'
      case 'processing': return 'Processando'
      case 'success': return 'Resultado'
      case 'error': return 'Erro'
      default: return ''
    }
  }

  if (authLoading) return null

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--color-brand-primary)]" />
              <h1 className="text-xl font-semibold text-white/90">VenStudio Pro</h1>
            </div>
            <p className="text-sm text-white/40 mt-0.5">{phaseLabel(premium.state)}</p>
          </div>
          {selectedVeiculo && (
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5">
              <img
                src={fotoCapa(selectedVeiculo)}
                alt=""
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <p className="text-sm font-medium text-white/80">
                  {selectedVeiculo.marca} {selectedVeiculo.modelo}
                </p>
                <p className="text-xs text-white/40">{selectedVeiculo.ano_modelo}</p>
              </div>
            </div>
          )}
        </div>

        {/* Steps indicator */}
        {premium.state !== 'idle' && (
          <div className="flex items-center gap-2 mb-8 max-w-md">
            {['Foto', 'Ambiente', 'Resultado'].map((label, i) => {
              const stepStates: PremiumState[][] = [
                ['idle'],
                ['selecting'],
                ['processing', 'success', 'error'],
              ]
              const isActive = stepStates[i].includes(premium.state) ||
                (i === 0 && selectedFoto != null)
              const isDone = i === 0 ? (premium.state !== 'idle') :
                i === 1 ? ['processing', 'success', 'error'].includes(premium.state) :
                premium.state === 'success'
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                    ${isDone
                      ? 'bg-[var(--color-brand-primary)] text-white'
                      : isActive
                        ? 'bg-[var(--color-brand-primary)]/20 text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]/40'
                        : 'bg-white/5 text-white/30'
                    }
                  `}>
                    {i + 1}
                  </div>
                  <span className={`text-xs ${isActive || isDone ? 'text-white/70' : 'text-white/30'}`}>
                    {label}
                  </span>
                  {i < 2 && <div className="flex-1 h-px bg-white/10" />}
                </div>
              )
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── Phase: Vehicle selection ── */}
          {!selectedVeiculo && (
            <motion.div
              key="vehicles"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {veiculosLoading ? (
                <div className="text-center py-20 text-white/40">Carregando veículos...</div>
              ) : veiculos.length === 0 ? (
                <div className="text-center py-20">
                  <Car size={48} className="mx-auto mb-4 text-white/20" />
                  <p className="text-white/50 mb-4">Nenhum veículo cadastrado</p>
                  <Button onClick={() => navigate('/anunciar')} className="bg-[var(--color-brand-primary)] text-white">
                    Publicar anúncio
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {veiculos.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleSelectVeiculo(v)}
                      className="group text-left rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 overflow-hidden transition-all"
                    >
                      <div className="aspect-[16/10] overflow-hidden">
                        <img
                          src={fotoCapa(v)}
                          alt={`${v.marca} ${v.modelo}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <p className="font-medium text-white/90">{v.marca} {v.modelo}</p>
                        <p className="text-sm text-white/40">{v.ano_modelo} • {v.versao}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Phase: Photo selection ── */}
          {selectedVeiculo && !selectedFoto && premium.state === 'idle' && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {loadingFotos ? (
                <div className="text-center py-20 text-white/40">Carregando fotos...</div>
              ) : fotosVeiculo.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-white/50">Este veículo não possui fotos</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {fotosVeiculo.map((foto) => (
                    <button
                      key={foto.id}
                      onClick={() => handleSelectFoto(foto)}
                      className="group rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={foto.url_original}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2 text-center">
                        <p className="text-xs text-white/40">Foto {foto.ordem + 1}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Phase: Style selection ── */}
          {premium.state === 'selecting' && (
            <motion.div
              key="selecting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Preview da foto selecionada */}
              {selectedFoto && (
                <div className="max-w-sm mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                  <img src={selectedFoto.url_original} alt="Foto selecionada" className="w-full h-auto" />
                </div>
              )}

              <div className="text-center">
                <h2 className="text-lg font-medium text-white/90 mb-1">Escolha o ambiente</h2>
                <p className="text-sm text-white/40">Selecione o cenário para aplicar à foto</p>
              </div>

              <StyleSelector
                selected={premium.selectedPreset}
                onSelect={premium.setPreset}
              />

              {premium.selectedPreset && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <Button
                    onClick={handleStartProcessing}
                    className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/80 text-white gap-2 px-8 py-3 text-base"
                  >
                    <Sparkles size={18} />
                    Gerar imagem
                    <ArrowRight size={16} />
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Phase: Processing ── */}
          {premium.state === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProcessingStatus
                tentativas={premium.tentativas}
                startedAt={processStartedAt ?? undefined}
              />
            </motion.div>
          )}

          {/* ── Phase: Success ── */}
          {premium.state === 'success' && premium.result && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ResultViewer
                originalUrl={selectedFoto?.url_original ?? ''}
                processedUrl={premium.result.url_processada!}
                presetNome={premium.selectedPreset ? PRESETS[premium.selectedPreset].nome : ''}
                hammingDistance={premium.result.hamming_distance}
                onRetry={premium.retry}
                onChangeStyle={handleChangeStyle}
              />
            </motion.div>
          )}

          {/* ── Phase: Error ── */}
          {premium.state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ResultError
                message={premium.error ?? 'Erro desconhecido'}
                onRetry={premium.retry}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
