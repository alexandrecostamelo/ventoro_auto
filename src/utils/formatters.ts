export function formatarPreco(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

export function formatarKm(km: number): string {
  return new Intl.NumberFormat('pt-BR').format(km) + ' km'
}

export function formatarData(data: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(data))
}

export function formatarDataRelativa(data: string): string {
  const diff = Date.now() - new Date(data).getTime()
  const dias = Math.floor(diff / 86400000)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias} dias`
  if (dias < 30) return `há ${Math.floor(dias / 7)} semanas`
  if (dias < 365) return `há ${Math.floor(dias / 30)} meses`
  return `há ${Math.floor(dias / 365)} anos`
}

export function gerarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}
