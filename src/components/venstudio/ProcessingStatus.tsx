import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface ProcessingStatusProps {
  tentativas?: number
  startedAt?: number
}

const MESSAGES = [
  'Preparando ambiente...',
  'Analisando iluminação...',
  'Compondo cenário...',
  'Refinando detalhes...',
  'Validando resultado...',
]

export function ProcessingStatus({ tentativas = 1, startedAt }: ProcessingStatusProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // Rotate messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Fake progress (logarithmic curve, max 90%)
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return 90
        return prev + (90 - prev) * 0.05
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Elapsed time
  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto text-center py-16"
    >
      {/* Spinner */}
      <div className="relative w-20 h-20 mx-auto mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-brand-primary)] border-r-[var(--color-brand-primary)]/30"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles size={24} className="text-[var(--color-brand-primary)]" />
        </div>
      </div>

      {/* Message */}
      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-lg font-medium text-white/90 mb-2"
      >
        {MESSAGES[messageIndex]}
      </motion.p>
      <p className="text-sm text-white/40 mb-8">
        Isso pode levar alguns segundos
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs mx-auto">
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--color-brand-primary)] to-[var(--color-brand-primary)]/60 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/30">
          <span>{elapsed > 0 ? `${elapsed}s` : ''}</span>
          {tentativas > 1 && <span>Tentativa {tentativas}/3</span>}
        </div>
      </div>
    </motion.div>
  )
}
