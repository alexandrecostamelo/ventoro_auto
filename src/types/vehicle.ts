export interface Vehicle {
  id: string;
  slug: string;
  marca: string;
  modelo: string;
  versao: string;
  ano: number;
  quilometragem: number;
  preco: number;
  combustivel: string;
  cambio: string;
  cor: string;
  potencia: string;
  torque?: string;
  consumo_cidade?: string;
  consumo_estrada?: string;
  cidade: string;
  estado: string;
  fotos: string[];
  score_confianca: number;
  preco_status: "abaixo" | "na_media" | "acima";
  preco_sugerido: { min: number; max: number };
  descricao: string;
  opcionais: string[];
  tipo_anunciante: "particular" | "garagem";
  garagem_id?: string;
  selo_studio_ia: boolean;
  selo_video_ia: boolean;
  selo_inspecao: boolean;
  destaque: boolean;
  data_publicacao: string;
  visualizacoes: number;
  favoritos_count: number;
  leads_count: number;
}

export interface Garage {
  id: string;
  slug: string;
  nome: string;
  logo_url: string;
  capa_url: string;
  descricao: string;
  cidade: string;
  estado: string;
  telefone: string;
  whatsapp: string;
  email: string;
  score_confianca: number;
  total_vendas: number;
  avaliacao: number;
  total_estoque: number;
  tempo_resposta_minutos: number;
  plano: "starter" | "pro" | "premium";
  verificada: boolean;
  cnpj_verificado: boolean;
  anos_plataforma: number;
  especialidade: string;
}
