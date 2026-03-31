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

export interface Lead {
  id: string;
  veiculo_id: string;
  nome: string;
  telefone: string;
  mensagem: string;
  origem: "whatsapp" | "formulario" | "agendamento";
  status: "novo" | "em_contato" | "proposta" | "visita" | "vendido" | "perdido";
  data: string;
  veiculo_nome: string;
}

export interface Alert {
  id: string;
  nome: string;
  filtros: { marca?: string; modelo?: string; preco_max?: number; km_max?: number; cidade?: string };
  total_matches: number;
  ativo: boolean;
  ultima_notificacao: string;
}

const carPhotos = [
  "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80",
  "https://images.unsplash.com/photo-1606611013016-969c19ba27a5?w=800&q=80",
  "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80",
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
  "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
  "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80",
  "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
  "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80",
  "https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=800&q=80",
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
];

export const vehicles: Vehicle[] = [
  {
    id: "vhc-001", slug: "honda-civic-exl-2022-prata-sp", marca: "Honda", modelo: "Civic", versao: "EXL CVT", ano: 2022, quilometragem: 28000, preco: 128900, combustivel: "Flex", cambio: "CVT", cor: "Prata Lunar", potencia: "173 cv", torque: "22,4 kgfm", consumo_cidade: "11,8 km/l", consumo_estrada: "14,2 km/l", cidade: "Presidente Prudente", estado: "SP",
    fotos: [carPhotos[0], carPhotos[1], carPhotos[2], carPhotos[3], carPhotos[4], carPhotos[5]],
    score_confianca: 96, preco_status: "abaixo", preco_sugerido: { min: 122000, max: 134000 },
    descricao: "Honda Civic EXL 2022 em perfeito estado de conservação. Único dono, todas as revisões feitas na concessionária Honda, documentação 100% em ordem. IPVA 2025 pago. Veículo não possui histórico de sinistros.",
    opcionais: ["Ar-condicionado automático", "Câmera de ré 360°", "Central multimídia 9\"", "Teto solar elétrico", "Bancos em couro", "Sensor de estacionamento", "Faróis full LED", "Apple CarPlay e Android Auto", "Piloto automático adaptativo", "Frenagem automática"],
    tipo_anunciante: "particular", selo_studio_ia: true, selo_video_ia: true, selo_inspecao: true, destaque: true,
    data_publicacao: "2025-03-10", visualizacoes: 847, favoritos_count: 34, leads_count: 12,
  },
  {
    id: "vhc-002", slug: "toyota-corolla-altis-2023", marca: "Toyota", modelo: "Corolla", versao: "Altis Premium", ano: 2023, quilometragem: 15000, preco: 159900, combustivel: "Flex", cambio: "CVT", cor: "Branco Pérola", potencia: "177 cv", torque: "21,4 kgfm", consumo_cidade: "12,1 km/l", consumo_estrada: "15,0 km/l", cidade: "São Paulo", estado: "SP",
    fotos: [carPhotos[6], carPhotos[7], carPhotos[8], carPhotos[9], carPhotos[10], carPhotos[11]],
    score_confianca: 94, preco_status: "na_media", preco_sugerido: { min: 155000, max: 165000 },
    descricao: "Toyota Corolla Altis Premium 2023 com baixa quilometragem. Todas as revisões na concessionária Toyota. Veículo impecável.",
    opcionais: ["Ar-condicionado digital", "Câmera de ré", "Central multimídia 10\"", "Bancos em couro", "Sensor de estacionamento", "Faróis LED", "Apple CarPlay"],
    tipo_anunciante: "garagem", garagem_id: "grg-001", selo_studio_ia: true, selo_video_ia: false, selo_inspecao: true, destaque: true,
    data_publicacao: "2025-03-12", visualizacoes: 623, favoritos_count: 28, leads_count: 9,
  },
  {
    id: "vhc-003", slug: "ford-ranger-xls-2021", marca: "Ford", modelo: "Ranger", versao: "XLS 2.2 Diesel", ano: 2021, quilometragem: 52000, preco: 189900, combustivel: "Diesel", cambio: "Automático", cor: "Preto Pantera", potencia: "160 cv", cidade: "Campinas", estado: "SP",
    fotos: [carPhotos[2], carPhotos[3], carPhotos[0], carPhotos[1], carPhotos[4], carPhotos[5]],
    score_confianca: 91, preco_status: "abaixo", preco_sugerido: { min: 185000, max: 198000 },
    descricao: "Ford Ranger XLS 2021 Diesel 4x4. Veículo robusto e bem conservado. Pneus novos, revisão recente.",
    opcionais: ["Ar-condicionado", "Câmera de ré", "Central multimídia", "Capota marítima", "Estribo lateral"],
    tipo_anunciante: "garagem", garagem_id: "grg-002", selo_studio_ia: false, selo_video_ia: false, selo_inspecao: false, destaque: false,
    data_publicacao: "2025-03-08", visualizacoes: 412, favoritos_count: 19, leads_count: 7,
  },
  {
    id: "vhc-004", slug: "jeep-compass-limited-2022", marca: "Jeep", modelo: "Compass", versao: "Limited T270 Flex", ano: 2022, quilometragem: 35000, preco: 149900, combustivel: "Flex", cambio: "Automático", cor: "Cinza Granite", potencia: "185 cv", cidade: "Ribeirão Preto", estado: "SP",
    fotos: [carPhotos[4], carPhotos[5], carPhotos[6], carPhotos[7], carPhotos[8], carPhotos[9]],
    score_confianca: 88, preco_status: "na_media", preco_sugerido: { min: 145000, max: 155000 },
    descricao: "Jeep Compass Limited 2022 Flex com pacote completo. Interior impecável, sem arranhões na lataria.",
    opcionais: ["Ar-condicionado dual zone", "Câmera 360°", "Central multimídia 8.4\"", "Teto solar panorâmico", "Bancos em couro", "Piloto automático"],
    tipo_anunciante: "particular", selo_studio_ia: true, selo_video_ia: true, selo_inspecao: false, destaque: true,
    data_publicacao: "2025-03-14", visualizacoes: 534, favoritos_count: 22, leads_count: 8,
  },
  {
    id: "vhc-005", slug: "bmw-320i-2023", marca: "BMW", modelo: "320i", versao: "Sport GP", ano: 2023, quilometragem: 12000, preco: 249900, combustivel: "Gasolina", cambio: "Automático", cor: "Azul Portimão", potencia: "184 cv", cidade: "São Paulo", estado: "SP",
    fotos: [carPhotos[8], carPhotos[9], carPhotos[10], carPhotos[11], carPhotos[0], carPhotos[1]],
    score_confianca: 97, preco_status: "na_media", preco_sugerido: { min: 240000, max: 260000 },
    descricao: "BMW 320i Sport GP 2023 com apenas 12 mil km. Garantia de fábrica até 2026. Estado de zero.",
    opcionais: ["Ar-condicionado digital tri-zone", "Câmera 360°", "Head-up display", "Bancos elétricos em couro", "Teto solar", "Harman Kardon", "BMW Connected Drive"],
    tipo_anunciante: "garagem", garagem_id: "grg-001", selo_studio_ia: true, selo_video_ia: true, selo_inspecao: true, destaque: true,
    data_publicacao: "2025-03-15", visualizacoes: 1203, favoritos_count: 67, leads_count: 18,
  },
  {
    id: "vhc-006", slug: "vw-tcross-highline-2022", marca: "Volkswagen", modelo: "T-Cross", versao: "Highline TSI", ano: 2022, quilometragem: 31000, preco: 119900, combustivel: "Flex", cambio: "Automático", cor: "Vermelho Sunset", potencia: "150 cv", cidade: "São Paulo", estado: "SP",
    fotos: [carPhotos[10], carPhotos[11], carPhotos[0], carPhotos[1], carPhotos[2], carPhotos[3]],
    score_confianca: 85, preco_status: "acima", preco_sugerido: { min: 110000, max: 118000 },
    descricao: "VW T-Cross Highline TSI 2022. Veículo completo com ótimo custo-benefício. Revisões em dia.",
    opcionais: ["Ar-condicionado digital", "Câmera de ré", "Central VW Play", "Teto solar", "Sensor de estacionamento"],
    tipo_anunciante: "particular", selo_studio_ia: false, selo_video_ia: false, selo_inspecao: false, destaque: false,
    data_publicacao: "2025-03-05", visualizacoes: 298, favoritos_count: 11, leads_count: 4,
  },
  {
    id: "vhc-007", slug: "hyundai-hb20s-2021", marca: "Hyundai", modelo: "HB20S", versao: "Diamond Plus", ano: 2021, quilometragem: 44000, preco: 79900, combustivel: "Flex", cambio: "Automático", cor: "Cinza Sand", potencia: "120 cv", cidade: "Presidente Prudente", estado: "SP",
    fotos: [carPhotos[3], carPhotos[4], carPhotos[5], carPhotos[6], carPhotos[7], carPhotos[8]],
    score_confianca: 82, preco_status: "abaixo", preco_sugerido: { min: 78000, max: 86000 },
    descricao: "Hyundai HB20S Diamond Plus 2021. Segundo dono, todas as revisões feitas. Excelente primeiro carro premium.",
    opcionais: ["Ar-condicionado", "Câmera de ré", "Central multimídia BlueMedia", "Rodas de liga 16\""],
    tipo_anunciante: "particular", selo_studio_ia: false, selo_video_ia: false, selo_inspecao: false, destaque: false,
    data_publicacao: "2025-03-01", visualizacoes: 189, favoritos_count: 8, leads_count: 3,
  },
  {
    id: "vhc-008", slug: "chevrolet-s10-ltz-2022", marca: "Chevrolet", modelo: "S10", versao: "LTZ 2.8 Diesel 4x4", ano: 2022, quilometragem: 41000, preco: 219900, combustivel: "Diesel", cambio: "Automático", cor: "Branco Summit", potencia: "200 cv", cidade: "Campinas", estado: "SP",
    fotos: [carPhotos[5], carPhotos[6], carPhotos[7], carPhotos[8], carPhotos[9], carPhotos[10]],
    score_confianca: 93, preco_status: "na_media", preco_sugerido: { min: 215000, max: 228000 },
    descricao: "Chevrolet S10 LTZ 2022 Diesel 4x4. Veículo top de linha, perfeito para trabalho e lazer.",
    opcionais: ["Ar-condicionado digital", "MyLink com tela 8\"", "Câmera de ré", "Bancos em couro", "Capota rígida", "Santo Antônio"],
    tipo_anunciante: "garagem", garagem_id: "grg-003", selo_studio_ia: true, selo_video_ia: false, selo_inspecao: true, destaque: true,
    data_publicacao: "2025-03-13", visualizacoes: 567, favoritos_count: 25, leads_count: 10,
  },
  {
    id: "vhc-009", slug: "audi-a3-sedan-2022", marca: "Audi", modelo: "A3 Sedan", versao: "Performance Black S-Tronic", ano: 2022, quilometragem: 22000, preco: 219900, combustivel: "Gasolina", cambio: "Automático", cor: "Preto Mythos", potencia: "190 cv", cidade: "São Paulo", estado: "SP",
    fotos: [carPhotos[7], carPhotos[8], carPhotos[9], carPhotos[10], carPhotos[11], carPhotos[0]],
    score_confianca: 95, preco_status: "abaixo", preco_sugerido: { min: 218000, max: 235000 },
    descricao: "Audi A3 Sedan Performance Black 2022. Visual esportivo exclusivo, interior premium. Garantia até 2025.",
    opcionais: ["Ar-condicionado tri-zone", "Virtual cockpit", "Bang & Olufsen", "Teto solar", "Bancos esportivos em couro", "Matrix LED"],
    tipo_anunciante: "garagem", garagem_id: "grg-001", selo_studio_ia: true, selo_video_ia: true, selo_inspecao: true, destaque: true,
    data_publicacao: "2025-03-11", visualizacoes: 945, favoritos_count: 42, leads_count: 15,
  },
  {
    id: "vhc-010", slug: "toyota-hilux-srx-2023", marca: "Toyota", modelo: "Hilux", versao: "SRX 2.8 Diesel 4x4", ano: 2023, quilometragem: 18000, preco: 299900, combustivel: "Diesel", cambio: "Automático", cor: "Cinza Graphite", potencia: "204 cv", cidade: "Ribeirão Preto", estado: "SP",
    fotos: [carPhotos[9], carPhotos[10], carPhotos[11], carPhotos[0], carPhotos[1], carPhotos[2]],
    score_confianca: 98, preco_status: "na_media", preco_sugerido: { min: 290000, max: 310000 },
    descricao: "Toyota Hilux SRX 2023 com pouquíssima quilometragem. Garantia de fábrica. Estado impecável.",
    opcionais: ["Ar-condicionado digital", "Central multimídia 8\"", "Câmera de ré", "Bancos em couro", "Controle de tração", "7 airbags"],
    tipo_anunciante: "garagem", garagem_id: "grg-003", selo_studio_ia: true, selo_video_ia: true, selo_inspecao: true, destaque: true,
    data_publicacao: "2025-03-16", visualizacoes: 1456, favoritos_count: 78, leads_count: 22,
  },
  {
    id: "vhc-011", slug: "vw-polo-gts-2022", marca: "Volkswagen", modelo: "Polo", versao: "GTS 1.4 TSI", ano: 2022, quilometragem: 26000, preco: 109900, combustivel: "Flex", cambio: "Automático", cor: "Vermelho Sunset", potencia: "150 cv", cidade: "Presidente Prudente", estado: "SP",
    fotos: [carPhotos[11], carPhotos[0], carPhotos[1], carPhotos[2], carPhotos[3], carPhotos[4]],
    score_confianca: 87, preco_status: "na_media", preco_sugerido: { min: 105000, max: 115000 },
    descricao: "VW Polo GTS 2022 — o hot hatch da Volkswagen. Visual esportivo, performance e economia.",
    opcionais: ["Ar-condicionado digital", "Central VW Play", "Bancos esportivos", "Rodas 17\"", "Spoiler traseiro"],
    tipo_anunciante: "particular", selo_studio_ia: false, selo_video_ia: false, selo_inspecao: false, destaque: false,
    data_publicacao: "2025-03-09", visualizacoes: 312, favoritos_count: 14, leads_count: 5,
  },
  {
    id: "vhc-012", slug: "fiat-pulse-drive-2023", marca: "Fiat", modelo: "Pulse", versao: "Drive 1.3 CVT", ano: 2023, quilometragem: 19000, preco: 89900, combustivel: "Flex", cambio: "CVT", cor: "Branco Banchisa", potencia: "107 cv", cidade: "São Paulo", estado: "SP",
    fotos: [carPhotos[1], carPhotos[2], carPhotos[3], carPhotos[4], carPhotos[5], carPhotos[6]],
    score_confianca: 80, preco_status: "acima", preco_sugerido: { min: 82000, max: 88000 },
    descricao: "Fiat Pulse Drive 2023. SUV compacto ideal para cidade. Econômico e moderno.",
    opcionais: ["Ar-condicionado", "Central multimídia 10.1\"", "Câmera de ré", "Sensor de estacionamento"],
    tipo_anunciante: "particular", selo_studio_ia: false, selo_video_ia: false, selo_inspecao: false, destaque: false,
    data_publicacao: "2025-03-07", visualizacoes: 234, favoritos_count: 9, leads_count: 3,
  },
];

export const garages: Garage[] = [
  {
    id: "grg-001", slug: "mb-motors-premium", nome: "MB Motors Premium",
    logo_url: "https://ui-avatars.com/api/?name=MB+Motors&background=534AB7&color=fff&size=128&font-size=0.4&bold=true",
    capa_url: "https://images.unsplash.com/photo-1567449303078-57ad995bd329?w=1200&q=80",
    descricao: "Especialistas em seminovos premium e de alto padrão desde 2008. Mais de 140 veículos vendidos com satisfação garantida.",
    cidade: "São Paulo", estado: "SP", telefone: "(11) 3456-7890", whatsapp: "11934567890", email: "contato@mbmotors.com.br",
    score_confianca: 99, total_vendas: 142, avaliacao: 4.9, total_estoque: 23, tempo_resposta_minutos: 8,
    plano: "premium", verificada: true, cnpj_verificado: true, anos_plataforma: 3, especialidade: "Seminovos premium",
  },
  {
    id: "grg-002", slug: "auto-excellence", nome: "Auto Excellence",
    logo_url: "https://ui-avatars.com/api/?name=Auto+E&background=1D9E75&color=fff&size=128&font-size=0.4&bold=true",
    capa_url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&q=80",
    descricao: "Referência em veículos seminovos na região de Campinas. Atendimento humanizado e transparência total.",
    cidade: "Campinas", estado: "SP", telefone: "(19) 3456-7890", whatsapp: "19934567890", email: "contato@autoexcellence.com.br",
    score_confianca: 95, total_vendas: 98, avaliacao: 4.7, total_estoque: 18, tempo_resposta_minutos: 15,
    plano: "pro", verificada: true, cnpj_verificado: true, anos_plataforma: 2, especialidade: "Seminovos multimarcas",
  },
  {
    id: "grg-003", slug: "prime-seminovos", nome: "Prime Seminovos",
    logo_url: "https://ui-avatars.com/api/?name=Prime&background=085041&color=fff&size=128&font-size=0.4&bold=true",
    capa_url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80",
    descricao: "Desde 2015 oferecendo os melhores seminovos de Ribeirão Preto e região.",
    cidade: "Ribeirão Preto", estado: "SP", telefone: "(16) 3456-7890", whatsapp: "16934567890", email: "contato@primeseminovos.com.br",
    score_confianca: 92, total_vendas: 76, avaliacao: 4.6, total_estoque: 15, tempo_resposta_minutos: 12,
    plano: "pro", verificada: true, cnpj_verificado: true, anos_plataforma: 2, especialidade: "Pickups e SUVs",
  },
  {
    id: "grg-004", slug: "top-veiculos", nome: "Top Veículos",
    logo_url: "https://ui-avatars.com/api/?name=Top+V&background=EF9F27&color=fff&size=128&font-size=0.4&bold=true",
    capa_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80",
    descricao: "Loja referência em Presidente Prudente com mais de 10 anos de mercado.",
    cidade: "Presidente Prudente", estado: "SP", telefone: "(18) 3456-7890", whatsapp: "18934567890", email: "contato@topveiculos.com.br",
    score_confianca: 88, total_vendas: 210, avaliacao: 4.5, total_estoque: 31, tempo_resposta_minutos: 20,
    plano: "starter", verificada: true, cnpj_verificado: true, anos_plataforma: 4, especialidade: "Populares e seminovos",
  },
];

export const leads: Lead[] = [
  { id: "lead-001", veiculo_id: "vhc-001", nome: "Carlos Eduardo", telefone: "(18) 99876-5432", mensagem: "Tenho interesse no Civic, aceita troca?", origem: "whatsapp", status: "novo", data: "2025-03-16T10:30:00", veiculo_nome: "Honda Civic EXL 2022" },
  { id: "lead-002", veiculo_id: "vhc-005", nome: "Ana Paula Silva", telefone: "(11) 99765-4321", mensagem: "Gostaria de agendar um test-drive na BMW.", origem: "agendamento", status: "em_contato", data: "2025-03-15T14:20:00", veiculo_nome: "BMW 320i Sport GP 2023" },
  { id: "lead-003", veiculo_id: "vhc-002", nome: "Roberto Mendes", telefone: "(11) 98654-3210", mensagem: "Qual o menor valor à vista?", origem: "formulario", status: "proposta", data: "2025-03-14T09:15:00", veiculo_nome: "Toyota Corolla Altis 2023" },
  { id: "lead-004", veiculo_id: "vhc-009", nome: "Fernanda Costa", telefone: "(11) 97543-2109", mensagem: "Vi o anúncio do A3, ainda disponível?", origem: "whatsapp", status: "visita", data: "2025-03-13T16:45:00", veiculo_nome: "Audi A3 Sedan 2022" },
  { id: "lead-005", veiculo_id: "vhc-004", nome: "Lucas Oliveira", telefone: "(16) 96432-1098", mensagem: "Aceita financiamento?", origem: "formulario", status: "novo", data: "2025-03-16T08:00:00", veiculo_nome: "Jeep Compass Limited 2022" },
  { id: "lead-006", veiculo_id: "vhc-010", nome: "Marcos Pereira", telefone: "(16) 95321-0987", mensagem: "Hilux impecável! Aceita consórcio contemplado?", origem: "whatsapp", status: "em_contato", data: "2025-03-12T11:30:00", veiculo_nome: "Toyota Hilux SRX 2023" },
  { id: "lead-007", veiculo_id: "vhc-001", nome: "Juliana Santos", telefone: "(18) 94210-9876", mensagem: "Olá, o IPVA está pago?", origem: "formulario", status: "vendido", data: "2025-03-10T13:00:00", veiculo_nome: "Honda Civic EXL 2022" },
  { id: "lead-008", veiculo_id: "vhc-008", nome: "Pedro Almeida", telefone: "(19) 93109-8765", mensagem: "Gostaria de ver a S10 pessoalmente.", origem: "agendamento", status: "perdido", data: "2025-03-09T15:30:00", veiculo_nome: "Chevrolet S10 LTZ 2022" },
];

export const alerts: Alert[] = [
  { id: "alt-001", nome: "SUV até R$ 150k", filtros: { preco_max: 150000, km_max: 50000, cidade: "São Paulo" }, total_matches: 14, ativo: true, ultima_notificacao: "2025-03-16T08:00:00" },
  { id: "alt-002", nome: "Honda Civic automático", filtros: { marca: "Honda", modelo: "Civic", preco_max: 140000 }, total_matches: 6, ativo: true, ultima_notificacao: "2025-03-15T10:00:00" },
  { id: "alt-003", nome: "Pickup Diesel 4x4", filtros: { preco_max: 250000, km_max: 60000 }, total_matches: 8, ativo: false, ultima_notificacao: "2025-03-10T12:00:00" },
];

export const mockUser = {
  id: "usr-001",
  nome: "João Victor",
  email: "joao@email.com",
  avatar_url: "https://ui-avatars.com/api/?name=João+Victor&background=1D9E75&color=fff&size=128",
  tipo: "particular" as const,
  cidade: "Presidente Prudente",
  estado: "SP",
};

export function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

export function formatKm(value: number): string {
  return value.toLocaleString("pt-BR") + " km";
}

export function simulateAsync<T>(data: T, delay = 800): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delay));
}
