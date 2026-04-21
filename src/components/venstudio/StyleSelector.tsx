import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { PresetId } from '@/lib/venstudio-types-v2'
import { PRESET_LIST } from '@/lib/venstudio-presets-v2'

interface StyleSelectorProps {
  selected: PresetId | null
  onSelect: (id: PresetId) => void
  disabled?: boolean
}

export function StyleSelector({ selected, onSelect, disabled }: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-4xl mx-auto">
      {PRESET_LIST.map((preset, i) => {
        const isSelected = selected === preset.id
        return (
          <motion.button
            key={preset.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            disabled={disabled}
            onClick={() => onSelect(preset.id)}
            className={`
              relative group rounded-2xl overflow-hidden border-2 transition-all duration-200
              text-left p-0 cursor-pointer
              ${isSelected
                ? 'border-[var(--color-brand-primary)] shadow-lg shadow-[var(--color-brand-primary)]/20'
                : 'border-white/10 hover:border-white/20'
              }
              ${disabled ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            {/* Gradient preview */}
            <div className={`h-24 bg-gradient-to-br ${preset.gradient} relative`}>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--color-brand-primary)] flex items-center justify-center"
                >
                  <Check size={14} className="text-white" />
                </motion.div>
              )}
            </div>

            {/* Info */}
            <div className="p-3 bg-white/[0.03]">
              <p className="text-sm font-medium text-white/90">{preset.nome}</p>
              <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{preset.desc}</p>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
