import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type LeadInsert = Database['public']['Tables']['leads']['Insert']

export function useLeads() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviarLead(lead: LeadInsert) {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('leads').insert(lead).select().single()
    setLoading(false)
    if (error) setError(error.message)
    return { data, error }
  }

  async function atualizarStatus(leadId: string, status: LeadInsert['status']) {
    const { error } = await supabase.from('leads').update({ status }).eq('id', leadId)
    return { error }
  }

  return { enviarLead, atualizarStatus, loading, error }
}
