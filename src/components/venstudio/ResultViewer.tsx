import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Download, RotateCcw, ArrowLeftRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ResultViewerProps {
  originalUrl: string
  processedUrl: string
  presetNome: string
  hammingDistance?: number | null
  onRetry: () => void
  onChangeStyle: () => void
}

export function ResultViewer({
  originalUrl,
  processedUrl,
  presetNome,
  hammingDistance,
  onRetry,
  onChangeStyle,
}: ResultViewerProps) {
  const [showComparison, setShowComparison] = useState(false)
  const [sliderPos, setSliderPos] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSliderMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const pos = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    setSliderPos(pos)
  }, [])

  const handleDownload = useCallback(async () => {
    const res = await fetch(processedUrl)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `venstudio-${presetNome.toLowerCase()}.jpg`
    a.click()
    URL.revokeObjectURL(url)
  }, [processedUrl, presetNome])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      {/* Status */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <CheckCircle2 size={20} className="text-emerald-400" />
        <span className="text-sm font-medium text-emerald-400">
          Imagem gerada com sucesso
        </span>
        {hammingDistance != null && (
          <span className="text-xs text-white/30 ml-2">
            (integridade: {hammingDistance})
          </span>
        )}
      </div>

      {/* Image */}
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20 mb-6">
        {showComparison ? (
          /* Before/After slider */
          <div
            ref={containerRef}
            className="relative cursor-col-resize select-none"
            onMouseMove={(e) => e.buttons === 1 && handleSliderMove(e)}
            onTouchMove={handleSliderMove}
            onMouseDown={handleSliderMove}
          >
            <img src={processedUrl} alt="Processada" className="w-full h-auto block" />
            <div
              className="absolute top-0 left-0 bottom-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={originalUrl}
                alt="Original"
                className="h-full object-cover"
                style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%' }}
              />
            </div>
            {/* Slider handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
                <ArrowLeftRight size={14} className="text-gray-800" />
              </div>
            </div>
            {/* Labels */}
            <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 text-xs text-white/80">Original</div>
            <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 text-xs text-white/80">{presetNome}</div>
          </div>
        ) : (
          <img src={processedUrl} alt="Resultado" className="w-full h-auto block" />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={handleDownload}
          className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/80 text-white gap-2"
        >
          <Download size={16} />
          Download
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowComparison(!showComparison)}
          className="border-white/10 text-white/70 hover:text-white gap-2"
        >
          <ArrowLeftRight size={16} />
          {showComparison ? 'Esconder' : 'Comparar'}
        </Button>

        <Button
          variant="outline"
          onClick={onRetry}
          className="border-white/10 text-white/70 hover:text-white gap-2"
        >
          <RotateCcw size={16} />
          Refazer
        </Button>

        <Button
          variant="ghost"
          onClick={onChangeStyle}
          className="text-white/50 hover:text-white"
        >
          Trocar ambiente
        </Button>
      </div>
    </motion.div>
  )
}

/** Error state component */
export function ResultError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto text-center py-16"
    >
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <h3 className="text-lg font-medium text-white/90 mb-2">
        Erro no processamento
      </h3>
      <p className="text-sm text-white/50 mb-6">{message}</p>
      <Button
        onClick={onRetry}
        className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/80 text-white gap-2"
      >
        <RotateCcw size={16} />
        Tentar novamente
      </Button>
    </motion.div>
  )
}
