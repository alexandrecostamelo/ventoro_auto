import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, Image as ImageIcon, X } from 'lucide-react'

interface UploadAreaProps {
  onFileSelected: (file: File) => void
  previewUrl: string | null
  onClear: () => void
  disabled?: boolean
}

export function UploadArea({ onFileSelected, previewUrl, onClear, disabled }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    onFileSelected(file)
  }, [onFileSelected])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile, disabled])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  if (previewUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/20 max-w-lg mx-auto"
      >
        <img src={previewUrl} alt="Preview" className="w-full h-auto" />
        <button
          onClick={onClear}
          disabled={disabled}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-colors disabled:opacity-50"
        >
          <X size={16} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-xs text-white/60">Imagem carregada</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative cursor-pointer rounded-2xl border-2 border-dashed p-12
        flex flex-col items-center justify-center gap-4 transition-all duration-200
        max-w-lg mx-auto
        ${isDragging
          ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/5'
          : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
        }
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-[var(--color-brand-primary)]/10' : 'bg-white/5'}`}>
        {isDragging ? <ImageIcon size={32} className="text-[var(--color-brand-primary)]" /> : <Upload size={32} className="text-white/40" />}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-white/80">
          {isDragging ? 'Solte a imagem aqui' : 'Arraste uma foto ou clique para selecionar'}
        </p>
        <p className="text-xs text-white/40 mt-1">JPG ou PNG</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </motion.div>
  )
}
