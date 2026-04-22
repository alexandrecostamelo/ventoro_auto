const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const envFiles = ['.env.local', '.env', '.env.vercel']
let vars = {}
for (const f of envFiles) {
  try {
    const content = fs.readFileSync(f, 'utf8')
    for (const line of content.split('\n')) {
      const m = line.trim().match(/^([A-Z_]+)=(.+)$/)
      if (m) vars[m[1]] = m[2].trim().replace(/\r/g, '')
    }
  } catch {}
}

const supaUrl = vars.VITE_SUPABASE_URL || vars.SUPABASE_URL
const supaKey = vars.SUPABASE_SERVICE_ROLE_KEY || vars.VITE_SUPABASE_ANON_KEY

if (!supaUrl || !supaKey) {
  console.error('Missing SUPABASE_URL or key')
  console.log('Available env vars:', Object.keys(vars).join(', '))
  process.exit(1)
}

console.log('Using key type:', vars.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon')
console.log('URL:', JSON.stringify(supaUrl))
run(supaUrl, supaKey)

async function run(supaUrl, supaKey) {
  const db = createClient(supaUrl, supaKey)

  const { data, error } = await db
    .from('processamentos_ia')
    .select('id, status, erro, cenario, engine_used, created_at, foto_original_url, foto_processada_url, url_foto_original')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Query error:', error)
    return
  }

  console.log(`\n=== Últimos ${data.length} processamentos ===\n`)
  for (const r of data) {
    console.log(`ID: ${r.id}`)
    console.log(`  Status: ${r.status}`)
    console.log(`  Erro: ${r.erro || '(nenhum)'}`)
    console.log(`  Cenário: ${r.cenario}`)
    console.log(`  Engine: ${r.engine_used}`)
    console.log(`  Created: ${r.created_at}`)
    console.log(`  foto_original_url: ${r.foto_original_url ? r.foto_original_url.substring(0, 80) + '...' : '(null)'}`)
    console.log(`  url_foto_original: ${r.url_foto_original ? r.url_foto_original.substring(0, 80) + '...' : '(null)'}`)
    console.log(`  foto_processada_url: ${r.foto_processada_url ? r.foto_processada_url.substring(0, 80) + '...' : '(null)'}`)
    console.log()
  }
}
