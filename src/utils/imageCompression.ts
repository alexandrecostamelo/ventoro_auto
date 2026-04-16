import imageCompression from 'browser-image-compression'

const TIPOS_ACEITOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/gif',
]

/**
 * Valida se o arquivo é uma imagem aceita.
 * Retorna mensagem de erro ou null se válido.
 */
export function validarArquivoImagem(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return `"${file.name}" não é uma imagem. Apenas JPEG, PNG e WebP são aceitos.`
  }
  if (!TIPOS_ACEITOS.includes(file.type)) {
    const ext = file.type.split('/')[1]?.toUpperCase() ?? file.name.split('.').pop()?.toUpperCase() ?? '?'
    return `Formato ${ext} não suportado. Use JPEG, PNG ou WebP.`
  }
  return null
}

export interface CompressOptions {
  /** Largura máxima em pixels (default: 1920) */
  maxWidth?: number
  /** Altura máxima em pixels (default: 1080) */
  maxHeight?: number
  /** Qualidade JPEG 0–1 (default: 0.85) */
  quality?: number
  /** Tamanho máximo em MB (default: 4.5 — margem pro limite de 5MB do bucket) */
  maxSizeMB?: number
}

/**
 * Comprime uma imagem para upload no Supabase Storage.
 *
 * - Redimensiona se exceder maxWidth ou maxHeight (mantendo aspect ratio)
 * - Converte para JPEG (exceto SVG que é retornado sem alteração)
 * - Se já for JPEG < maxSizeMB, retorna sem reprocessar
 * - Retorna um File com type 'image/jpeg' e extensão .jpg
 */
export async function comprimirImagem(file: File, options: CompressOptions = {}): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    maxSizeMB = 4.5,
  } = options

  // SVG é vetorial — não precisa de compressão
  if (file.type === 'image/svg+xml') return file

  const fileSizeMB = file.size / (1024 * 1024)

  // Já é JPEG e já está dentro do limite — retorna sem reprocessar
  if (fileSizeMB <= maxSizeMB && file.type === 'image/jpeg') return file

  const compressed = await imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight: Math.max(maxWidth, maxHeight),
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: quality,
  })

  // Retorna como File com nome original mas extensão .jpg
  const nomeBase = file.name.replace(/\.[^/.]+$/, '')
  return new File([compressed], `${nomeBase}.jpg`, { type: 'image/jpeg' })
}
