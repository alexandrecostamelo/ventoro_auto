import { supabase } from './supabase'

// ============================================================
// Tipos
// ============================================================

export interface StorageResult {
  url: string | null
  error: string | null
}

export interface StorageDeleteResult {
  error: string | null
}

// ============================================================
// Helpers internos
// ============================================================

/** Deriva extensão a partir do MIME type do arquivo */
function extFromMime(file: File): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  }
  return map[file.type] ?? 'jpg'
}

function publicUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

// ============================================================
// BUCKET: fotos-veiculos
// Path: {veiculo_id}/{nome_arquivo}
// ============================================================

/**
 * Faz upload de uma foto para um veículo.
 * O caller é responsável por gerar um nomeArquivo único (ex: uuid + extensão).
 */
export async function uploadFotoVeiculo(
  veiculoId: string,
  file: File,
  nomeArquivo: string,
): Promise<StorageResult> {
  const path = `${veiculoId}/${nomeArquivo}`

  const { error } = await supabase.storage
    .from('fotos-veiculos')
    .upload(path, file, { upsert: false })

  if (error) return { url: null, error: error.message }
  return { url: publicUrl('fotos-veiculos', path), error: null }
}

/** Remove uma foto específica de um veículo */
export async function deleteFotoVeiculo(
  veiculoId: string,
  nomeArquivo: string,
): Promise<StorageDeleteResult> {
  const { error } = await supabase.storage
    .from('fotos-veiculos')
    .remove([`${veiculoId}/${nomeArquivo}`])
  return { error: error?.message ?? null }
}

/** Remove múltiplas fotos de um veículo em uma única chamada */
export async function deleteFotosVeiculo(
  veiculoId: string,
  nomes: string[],
): Promise<StorageDeleteResult> {
  const paths = nomes.map((n) => `${veiculoId}/${n}`)
  const { error } = await supabase.storage.from('fotos-veiculos').remove(paths)
  return { error: error?.message ?? null }
}

/** Retorna a URL pública de uma foto de veículo (sem chamada de rede) */
export function getUrlFotoVeiculo(veiculoId: string, nomeArquivo: string): string {
  return publicUrl('fotos-veiculos', `${veiculoId}/${nomeArquivo}`)
}

// ============================================================
// BUCKET: logos-garagens
// Path: {garagem_id}/logo.{ext}
// ============================================================

/**
 * Faz upload (ou substitui) o logo de uma garagem.
 * A extensão é derivada automaticamente do MIME type do arquivo.
 */
export async function uploadLogoGaragem(
  garagemId: string,
  file: File,
): Promise<StorageResult> {
  const ext = extFromMime(file)
  const path = `${garagemId}/logo.${ext}`

  const { error } = await supabase.storage
    .from('logos-garagens')
    .upload(path, file, { upsert: true })

  if (error) return { url: null, error: error.message }
  return { url: publicUrl('logos-garagens', path), error: null }
}

/** Remove o logo de uma garagem */
export async function deleteLogoGaragem(
  garagemId: string,
  ext: string,
): Promise<StorageDeleteResult> {
  const { error } = await supabase.storage
    .from('logos-garagens')
    .remove([`${garagemId}/logo.${ext}`])
  return { error: error?.message ?? null }
}

/** Retorna a URL pública do logo de uma garagem (sem chamada de rede) */
export function getUrlLogoGaragem(garagemId: string, ext: string): string {
  return publicUrl('logos-garagens', `${garagemId}/logo.${ext}`)
}

// ============================================================
// BUCKET: capas-garagens
// Path: {garagem_id}/capa.{ext}
// ============================================================

/**
 * Faz upload (ou substitui) a imagem de capa de uma garagem.
 * A extensão é derivada automaticamente do MIME type do arquivo.
 */
export async function uploadCapaGaragem(
  garagemId: string,
  file: File,
): Promise<StorageResult> {
  const ext = extFromMime(file)
  const path = `${garagemId}/capa.${ext}`

  const { error } = await supabase.storage
    .from('capas-garagens')
    .upload(path, file, { upsert: true })

  if (error) return { url: null, error: error.message }
  return { url: publicUrl('capas-garagens', path), error: null }
}

/** Remove a capa de uma garagem */
export async function deleteCapaGaragem(
  garagemId: string,
  ext: string,
): Promise<StorageDeleteResult> {
  const { error } = await supabase.storage
    .from('capas-garagens')
    .remove([`${garagemId}/capa.${ext}`])
  return { error: error?.message ?? null }
}

/** Retorna a URL pública da capa de uma garagem (sem chamada de rede) */
export function getUrlCapaGaragem(garagemId: string, ext: string): string {
  return publicUrl('capas-garagens', `${garagemId}/capa.${ext}`)
}

// ============================================================
// BUCKET: avatares
// Path: {user_id}/avatar.{ext}
// ============================================================

/**
 * Faz upload (ou substitui) o avatar do usuário autenticado.
 * A extensão é derivada automaticamente do MIME type do arquivo.
 */
export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<StorageResult> {
  const ext = extFromMime(file)
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from('avatares')
    .upload(path, file, { upsert: true })

  if (error) return { url: null, error: error.message }
  return { url: publicUrl('avatares', path), error: null }
}

/** Remove o avatar de um usuário */
export async function deleteAvatar(
  userId: string,
  ext: string,
): Promise<StorageDeleteResult> {
  const { error } = await supabase.storage
    .from('avatares')
    .remove([`${userId}/avatar.${ext}`])
  return { error: error?.message ?? null }
}

/** Retorna a URL pública do avatar de um usuário (sem chamada de rede) */
export function getUrlAvatar(userId: string, ext: string): string {
  return publicUrl('avatares', `${userId}/avatar.${ext}`)
}
