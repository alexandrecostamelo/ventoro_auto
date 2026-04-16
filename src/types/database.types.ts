export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          nome: string
          telefone: string | null
          cpf: string | null
          cidade: string | null
          estado: string | null
          tipo: 'comprador' | 'particular' | 'garagem' | 'admin'
          avatar_url: string | null
          garagem_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      garagens: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          slug: string
          nome: string
          razao_social: string | null
          cnpj: string | null
          descricao: string | null
          logo_url: string | null
          capa_url: string | null
          cidade: string
          estado: string
          telefone: string | null
          whatsapp: string | null
          email: string | null
          especialidade: string | null
          plano: 'starter' | 'pro' | 'premium'
          ativa: boolean
          verificada: boolean
          cnpj_verificado: boolean
          score_confianca: number
          total_vendas: number
          avaliacao: number
          tempo_resposta_minutos: number
          total_estoque: number
          anos_plataforma: number
        }
        Insert: Omit<Database['public']['Tables']['garagens']['Row'], 'created_at' | 'updated_at' | 'score_confianca' | 'total_vendas' | 'avaliacao' | 'tempo_resposta_minutos'>
        Update: Partial<Database['public']['Tables']['garagens']['Insert']>
      }
      veiculos: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          slug: string
          marca: string
          modelo: string
          versao: string | null
          ano: number
          quilometragem: number
          preco: number
          combustivel: 'flex' | 'gasolina' | 'etanol' | 'diesel' | 'eletrico' | 'hibrido'
          cambio: 'manual' | 'automatico' | 'cvt'
          cor: string | null
          potencia: string | null
          torque: string | null
          consumo_cidade: string | null
          consumo_estrada: string | null
          cidade: string
          estado: string
          descricao: string | null
          opcionais: string[]
          condicao: 'excelente' | 'otimo' | 'bom' | 'regular'
          ipva_pago: boolean
          revisoes_em_dia: boolean
          sem_sinistro: boolean
          num_chaves: number
          status: 'rascunho' | 'publicado' | 'pausado' | 'vendido' | 'expirado'
          tipo_anunciante: 'particular' | 'garagem'
          anunciante_id: string
          garagem_id: string | null
          plano: 'basico' | 'premium' | 'turbo'
          validade_ate: string | null
          score_confianca: number
          preco_status: 'abaixo' | 'na_media' | 'acima'
          preco_sugerido_min: number | null
          preco_sugerido_max: number | null
          selo_studio_ia: boolean
          selo_video_ia: boolean
          selo_inspecao: boolean
          destaque: boolean
          visualizacoes: number
          favoritos_count: number
          leads_count: number
          publicado_em: string | null
        }
        Insert: Omit<Database['public']['Tables']['veiculos']['Row'], 'created_at' | 'updated_at' | 'visualizacoes' | 'favoritos_count' | 'leads_count' | 'score_confianca'>
        Update: Partial<Database['public']['Tables']['veiculos']['Insert']>
      }
      fotos_veiculo: {
        Row: {
          id: string
          created_at: string
          veiculo_id: string
          url_original: string
          url_processada: string | null
          cenario_ia: string | null
          ordem: number
          is_capa: boolean
          processada_por_ia: boolean
        }
        Insert: Omit<Database['public']['Tables']['fotos_veiculo']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['fotos_veiculo']['Insert']>
      }
      conteudo_ia: {
        Row: {
          id: string
          created_at: string
          veiculo_id: string
          titulo: string | null
          descricao: string | null
          highlights: string[]
          faq: Json
          nota_qualidade: number | null
          sugestoes: string[]
          headline_landing: string | null
          copy_landing: string | null
        }
        Insert: Omit<Database['public']['Tables']['conteudo_ia']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['conteudo_ia']['Insert']>
      }
      leads: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          veiculo_id: string
          anunciante_id: string
          comprador_id: string | null
          nome: string
          telefone: string
          email: string | null
          mensagem: string | null
          origem: 'whatsapp' | 'formulario' | 'agendamento' | 'proposta'
          status: 'novo' | 'em_contato' | 'proposta' | 'visita' | 'negociacao' | 'vendido' | 'perdido'
          vendedor_id: string | null
          garagem_id: string | null
          valor_proposta: number | null
          notas: string | null
        }
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
      }
      favoritos: {
        Row: {
          id: string
          created_at: string
          user_id: string
          veiculo_id: string
          lista_nome: string
        }
        Insert: Omit<Database['public']['Tables']['favoritos']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['favoritos']['Insert']>
      }
      buscas_salvas: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          nome: string
          filtros: Json
          ativa: boolean
          frequencia: 'tempo_real' | 'diaria' | 'semanal'
          ultimo_disparo: string | null
          total_matches: number
        }
        Insert: Omit<Database['public']['Tables']['buscas_salvas']['Row'], 'created_at' | 'updated_at' | 'total_matches'>
        Update: Partial<Database['public']['Tables']['buscas_salvas']['Insert']>
      }
      historico_preco: {
        Row: {
          id: string
          created_at: string
          veiculo_id: string
          preco: number
        }
        Insert: Omit<Database['public']['Tables']['historico_preco']['Row'], 'created_at'>
        Update: never
      }
      assinaturas: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          garagem_id: string
          plano: 'starter' | 'pro' | 'premium'
          status: 'ativa' | 'cancelada' | 'inadimplente' | 'trial'
          stripe_subscription_id: string | null
          trial_ate: string | null
          proxima_cobranca: string | null
          valor_mensal: number
        }
        Insert: Omit<Database['public']['Tables']['assinaturas']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['assinaturas']['Insert']>
      }
      pagamentos: {
        Row: {
          id: string
          created_at: string
          anunciante_id: string
          veiculo_id: string | null
          tipo: 'anuncio' | 'upgrade' | 'assinatura'
          plano: string
          valor: number
          status: 'pendente' | 'pago' | 'falhou' | 'estornado'
          metodo: 'pix' | 'cartao' | 'boleto'
          stripe_payment_id: string | null
          pago_em: string | null
        }
        Insert: Omit<Database['public']['Tables']['pagamentos']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['pagamentos']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      incrementar_visualizacoes: {
        Args: { veiculo_id: string }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
