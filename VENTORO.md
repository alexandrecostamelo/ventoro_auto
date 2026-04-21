# VENTORO.md — Project Knowledge Base

> Este arquivo é a fonte de verdade do projeto Ventoro.
> Claude Code deve ler este arquivo antes de qualquer tarefa.
> Atualizar sempre que houver mudanças estruturais no projeto.

---

## O que é o Ventoro

Ventoro é um marketplace premium de anúncios de veículos com inteligência artificial integrada, desenvolvido para o mercado brasileiro. A plataforma conecta compradores, vendedores particulares e garagens/lojistas, transformando cada anúncio em um ativo de vendas com apresentação profissional, score de confiança e ferramentas de IA.

**Domínio:** ventoro.com.br
**Posicionamento:** "Seu próximo carro começa aqui."
**Diferencial central:** Não é um classificado — é um ecossistema automotivo inteligente com camadas de SaaS, marketplace, IA e motor de conversão.

---

## Identidade da marca

**Nome:** Ventoro
**Naming:** Ven- (vento, ventura, aventura) + -toro (touro, força, ímpeto)
**Tom de voz:** Confiante, tecnológico, premium mas acessível. Nunca arrogante, nunca genérico.
**Logo:** `/public/logo-ventoro.png` — fundo escuro, estilo metálico/tech, cor azul neon + prata
**Favicon:** `/public/logo-ventoro.png`

### Paleta de cores

```
Ventoro Green:  #1D9E75  — cor principal da marca
Deep Forest:    #085041  — verde escuro, hover e gradientes
Mint:           #9FE1CB  — verde claro, modo escuro
Ice Green:      #E1F5EE  — fundo de destaque verde
Asphalt:        #0C0C0A  — quase preto, texto principal e navbar
Pearl:          #F7F7F5  — fundo claro principal
Turbo Amber:    #EF9F27  — alertas, destaques, avisos
```

### Tipografia

```
Display / Títulos:  Syne (600, 700, 800)     — Google Fonts
Body / Interface:   DM Sans (300, 400, 500)  — Google Fonts
Dados / Código:     JetBrains Mono (400)     — Google Fonts
```

---

## Stack tecnológica

### Frontend (atual — fase MVP)
- **Framework:** React + TypeScript + Vite
- **Estilização:** Tailwind CSS + variáveis CSS customizadas
- **Roteamento:** React Router DOM
- **Gráficos:** Recharts
- **Gerador:** Lovable (geração inicial de UI)
- **Repositório:** GitHub
- **Deploy:** Vercel (via Lovable)

### Backend (ativo)
- **BaaS:** Supabase (Postgres, Auth, Storage, RLS) — projeto `flhrbrnuwkpcdsnplibo`
- **API:** Vercel Serverless Functions (api/venstudio/*.ts)
- **Filas de IA:** Replicate async com webhook (VenStudio Tier C)
- **Pagamentos:** Stripe (planejado) + Pix via Asaas (planejado)
- **Storage de mídia:** Supabase Storage (buckets: fotos-veiculos, fotos-perfil, documentos, venstudio-processados)

### IA (parcialmente ativo)
- **Texto:** Claude API (Anthropic) — copiloto, landing page, FAQ, análise (planejado)
- **Imagem:** Replicate API — VenStudio Tier C (Flux Fill Pro para inpainting premium) (ATIVO)
- **Imagem:** Sharp (Node.js) — VenStudio Tier B (composição determinística) (ATIVO)
- **Busca avançada:** Typesense ou Elasticsearch (planejado)

### Ferramentas de desenvolvimento
- **AI coding:** Claude Code — lógica, integrações, Edge Functions, migrações
- **UI generation:** Lovable — telas e componentes
- **Versionamento:** GitHub

---

## Arquitetura do produto — 4 camadas

### Camada 1 — Marketplace público
Rotas abertas, sem autenticação necessária.
Home, busca, resultados, detalhe do veículo, landing page por veículo, perfil da garagem, comparador, favoritos, alertas, pedido de busca reversa.

### Camada 2 — Área do anunciante (particular)
Requer autenticação. Perfil: `particular`.
Dashboard, publicação de anúncio (wizard 7 etapas), gestão de anúncios, leads recebidos, métricas, VenStudio IA, upgrades.

### Camada 3 — Área da garagem (PJ)
Requer autenticação. Perfil: `garagem`.
Dashboard, gestão de estoque, pipeline CRM de leads (kanban), configuração da vitrine, equipe comercial, relatórios, planos e cobrança.

### Camada 4 — Painel administrativo (IMPLEMENTADO)
Requer autenticação. Perfil: `admin`. Guard duplo: useAdmin hook (frontend) + RLS policies (banco).
7 páginas: Dashboard KPIs, Usuários CRUD, Garagens CRUD, Assinaturas, Financeiro, Logs auditoria, Configurações.
Dados reais do Supabase. Migration 021 aplicada com RLS admin em todas as tabelas.

---

## Estrutura de rotas

```
/                          Home pública
/buscar                    Resultados de busca
/veiculo/[slug]            Detalhe do veículo
/veiculo/[slug]/landing    Landing page inteligente por veículo
/garagem/[slug]            Perfil público da garagem
/comparar                  Comparador de veículos
/pedido-de-busca           Marketplace reverso
/favoritos                 Favoritos e watchlist (auth)
/alertas                   Gerenciador de alertas (auth)
/studio                    VenStudio IA standalone (auth)
/entrar                    Login
/cadastrar                 Cadastro
/minha-conta               Dashboard do particular (auth)
/minha-conta/anuncios      Gestão de anúncios
/minha-conta/leads         Leads recebidos
/minha-conta/metricas      Métricas
/painel                    Dashboard da garagem (auth)
/painel/estoque            Gestão de estoque
/painel/leads              CRM kanban
/painel/vitrine            Configuração da vitrine
/painel/equipe             Equipe comercial
/painel/relatorios         Relatórios
/painel/planos             Planos e cobrança
/studio                    VenStudio IA Tier B (standalone)
/studio-pro                VenStudio Premium V2 Tier C (auth)
/anunciar                  Wizard publicação de anúncio
/inspecionar/:slug         Inspeção visual IA
/admin                     Admin Dashboard (admin)
/admin/usuarios            Gestão de usuários (admin)
/admin/garagens            Gestão de garagens (admin)
/admin/assinaturas         Assinaturas (admin)
/admin/financeiro          Financeiro (admin)
/admin/logs                Logs auditoria (admin)
/admin/configuracoes       Configurações sistema (admin)
```

---

## Perfis de usuário

```
comprador      — busca, favoritos, alertas, comparador, proposta
particular     — tudo de comprador + publicar anúncios + dashboard + leads
garagem        — tudo de particular + vitrine + CRM + equipe + relatórios
admin          — acesso total ao painel administrativo
```

---

## Módulos de IA — nomenclatura oficial

| Nome interno     | Função                                                        |
|------------------|---------------------------------------------------------------|
| VenStudio IA     | Remoção de fundo de fotos + ambientação em cenários premium   |
| VideoGen IA      | Tour 360° sintético gerado a partir das fotos do veículo      |
| Copiloto Ventoro | Geração de título, descrição, highlights e FAQ do anúncio     |
| PriceAI          | Análise de preço vs FIPE + mercado regional + probabilidade   |
| Inspeção Visual  | Detecção de danos, amassados e desgaste nas fotos             |
| Assistente       | Chatbot de perguntas sobre qualquer veículo                   |
| IA Comercial     | Inteligência para garagens — leads, giro, anúncios parados    |
| AlertAI          | Matching inteligente de buscas salvas com novos anúncios      |

---

## Cenários do VenStudio IA

```
Showroom Premium   — ambiente interno clean, iluminação de estúdio
Cidade Noturna     — rua urbana à noite, reflexos no asfalto
Campo Aberto       — estrada aberta com natureza ao fundo
Pôr do Sol         — céu avermelhado, luz dourada lateral
Fundo Neutro       — branco ou cinza infinito, estilo catálogo
Beira Mar          — orla, céu azul, atmosfera premium
```

---

## Score de confiança — composição

O score vai de 0 a 100 e é composto por:

```
Fotos verificadas           — qualidade e autenticidade
Dados completos             — completude do anúncio
Identidade verificada       — CPF ou CNPJ confirmado
Histórico de anúncio        — sem alterações suspeitas
Inspeção visual IA          — análise das fotos por IA
Responsividade do vendedor  — tempo médio de resposta
Reputação na plataforma     — histórico de vendas e avaliações
```

Exibição: número em JetBrains Mono + ponto colorido (verde ≥85, amber 70–84, vermelho <70).

---

## Modelo de receita

### Particular (PF)

| Plano       | Preço      | Inclui                                              |
|-------------|------------|-----------------------------------------------------|
| Básico      | R$ 29      | 30 dias, fotos originais, WhatsApp                  |
| Premium     | R$ 79      | 60 dias, VenStudio IA, landing page, destaque local |
| Turbo       | R$ 149     | Tudo + impulsionamento, relatório de mercado        |

Upsells: Landing page adicional (+R$49), Destaque nacional (+R$39), Relatório (+R$29).

### Garagem (PJ) — assinatura mensal

| Plano    | Preço/mês   | Perfil                               |
|----------|-------------|--------------------------------------|
| Starter  | R$ 199      | Até 10 veículos, 1 vendedor          |
| Pro      | R$ 399      | Até 30 veículos, 3 vendedores, CRM   |
| Premium  | R$ 799      | Ilimitado, equipe completa, tudo IA  |

### Receita futura
Cobrança por lead qualificado, parcerias com financiamento/seguro/vistoria, publicidade premium.

---

## Dados

**Banco real:** Supabase Postgres com 21 migrações aplicadas. Auth real, RLS ativo.
**Dados mock:** `src/data/mock.ts` ainda usado em telas públicas (busca, detalhe) enquanto não há dados reais suficientes.

**Arquivo central de mock:** `src/data/mock.ts`

Contém:
- 12 veículos com todos os campos
- 4 garagens completas
- 8 leads mockados
- 3 alertas de busca
- Veículo principal: Honda Civic EXL 2022, slug `honda-civic-exl-2022-prata-sp`, R$ 128.900, score 96, Presidente Prudente/SP
- Garagem principal: MB Motors Premium, São Paulo, score 99, plano Premium

Regra: **nunca usar dados hardcoded nas telas — sempre importar de `src/data/mock.ts`**.

---

## Componentes principais — catálogo

```
VentoroLogo       — logo oficial, variantes: light / dark / brand, tamanhos: sm / md / lg
VehicleCard       — card de veículo para grids de busca e destaques
GarageCard        — card de garagem para listagens
ScoreBadge        — badge de score de confiança (número + ponto colorido)
PricePill         — pill de status de preço (abaixo/na média/acima)
ThemeToggle       — botão de alternância dark/light mode
FilterSidebar     — sidebar de filtros da busca
SearchBar         — barra de busca principal (hero e compacta)
VehicleGallery    — galeria com lightbox e thumbnails
SpecsGrid         — grid de especificações técnicas
AIAnalysisCard    — card de análise da Ventoro IA
TrustScoreCard    — card detalhado do score de confiança
SimulationCard    — simulação financeira com sliders
WizardProgress    — barra de progresso do fluxo de publicação
KanbanBoard       — pipeline CRM de leads da garagem
```

---

## Dark mode

Implementado via classe `.dark` no `<html>`. Controlado pelo `ThemeContext`.

```
Contexto:   src/contexts/ThemeContext.tsx
Hook:       useTheme() — retorna { theme, toggleTheme, isDark }
Toggle:     src/components/ThemeToggle.tsx — ícone sol/lua na navbar
Persistência: localStorage key: 'ventoro-theme'
Auto-detect: prefers-color-scheme na primeira visita
```

Variáveis CSS do dark mode definidas em `src/index.css` sob seletor `.dark { }`.

---

## Convenções de código

### Nomenclatura
```
Componentes:     PascalCase    — VehicleCard.tsx, VentoroLogo.tsx
Hooks:           camelCase     — useVehicles.ts, useFilters.ts, useTheme.ts
Páginas:         kebab-case    — vehicle-detail.tsx, garage-profile.tsx
Contextos:       PascalCase    — ThemeContext.tsx, AuthContext.tsx
Utilitários:     camelCase     — formatPrice.ts, formatKm.ts
Constantes:      UPPER_SNAKE   — FUEL_TYPES, VEHICLE_CATEGORIES
```

### Regras obrigatórias
- Sempre usar variáveis CSS de cor (`--color-brand-primary`, `--color-surface-base`, etc.) — nunca hardcodar hex nas telas
- Sempre usar Syne para títulos/preços e DM Sans para todo o resto
- Sempre importar dados de `src/data/mock.ts` — nunca hardcodar dados nas telas
- Sempre usar o componente `<VentoroLogo />` — nunca escrever o nome "Ventoro" em texto puro como logo
- Componentes devem ser mobile-first (breakpoints: mobile <768px, tablet 768–1024px, desktop >1024px)
- Touch targets mínimo 44px em mobile
- Todo input numérico de preço/km deve usar máscara de formatação brasileira (R$ 1.000.000)

### Formatação de dados brasileiros
```ts
// Preço
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(128900)
// → R$ 128.900,00

// Quilometragem
new Intl.NumberFormat('pt-BR').format(28000) + ' km'
// → 28.000 km

// Data
new Intl.DateTimeFormat('pt-BR').format(new Date('2025-03-10'))
// → 10/03/2025
```

---

## Estrutura de pastas esperada

```
ventoro/
├── public/
│   ├── logo-ventoro.png       — logo oficial
│   └── favicon.ico
├── src/
│   ├── components/            — componentes reutilizáveis
│   │   ├── VentoroLogo.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── VehicleCard.tsx
│   │   ├── GarageCard.tsx
│   │   └── ...
│   ├── contexts/
│   │   ├── ThemeContext.tsx
│   │   └── AuthContext.tsx    — auth mockado
│   ├── data/
│   │   └── mock.ts            — todos os dados estáticos
│   ├── pages/                 — uma pasta por rota principal
│   │   ├── home/
│   │   ├── search/
│   │   ├── vehicle-detail/
│   │   ├── garage-profile/
│   │   ├── publish/           — wizard de publicação
│   │   ├── dashboard/         — particular
│   │   ├── panel/             — garagem
│   │   └── auth/              — login e cadastro
│   ├── hooks/                 — hooks customizados
│   ├── utils/                 — funções utilitárias
│   ├── types/                 — tipos TypeScript globais
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css              — variáveis CSS + dark mode
├── VENTORO.md                 — este arquivo (knowledge base)
├── CLAUDE.md                  — instruções para Claude Code
└── package.json
```

---

## Roadmap de desenvolvimento

### MVP (fase atual)
Frontend completo com dados mockados. Sem backend.
Telas: Home, Busca, Detalhe, Landing page, Garagem, Comparador, Publicação (wizard), Dashboard particular, Dashboard garagem, VenStudio IA, Favoritos, Alertas, Marketplace reverso, Login/Cadastro.

### Fase 2 — Backend e auth real
Conectar Supabase. Implementar auth real. Publicação de anúncios com persistência. Pagamentos Stripe + Pix. Score de confiança calculado. Alertas em tempo real (Supabase Realtime).

### Fase 3 — IA e escala
Integrar Claude API (copiloto, landing page, análise). Integrar Replicate (VenStudio IA). VideoGen. Busca vetorial. Recomendação preditiva. Integrações financiamento e seguro.

---

## Referências de mercado

**Concorrentes diretos (BR):** Webmotors, iCarros, OLX Autos, Mercado Livre Veículos
**Diferencial vs concorrentes:** Todos operam no modelo catálogo/classificado. Ventoro é orientado a conversão — cada anúncio é uma página de vendas inteligente.
**Referências de UI/UX:** Tesla.com, Porsche Digital, Linear.app, Vercel.com
**Referência de produto:** Zillow (EUA) para o modelo de marketplace imobiliário premium com IA

---

## Decisões de produto já tomadas

- Nome definitivo: **Ventoro** (não AutoVitrine, não VentoCar, não AutoAI)
- Módulo de fotos: **VenStudio IA** (não AutoStudio)
- Cor principal: **#1D9E75** — não mudar
- Fontes: **Syne + DM Sans + JetBrains Mono** — não mudar
- Backend MVP: **Supabase** (não NestJS na fase 1)
- AI coding: **Claude Code** como principal ferramenta de desenvolvimento
- UI generation: **Lovable** para criação inicial das telas
- Dark mode: implementado via classe `.dark`, toggle na navbar, persiste em localStorage

---

## Como Claude Code deve usar este arquivo

1. Ler este arquivo completo antes de iniciar qualquer tarefa
2. Consultar a seção de componentes antes de criar novos para evitar duplicatas
3. Consultar convenções de nomenclatura antes de nomear arquivos ou funções
4. Consultar o modelo de receita ao trabalhar em qualquer tela de planos ou pagamentos
5. Consultar os módulos de IA ao trabalhar em qualquer feature de inteligência artificial
6. Atualizar este arquivo quando: uma decisão de produto for tomada, um componente importante for criado, uma rota for adicionada, uma convenção for estabelecida
7. Nunca contradizer as decisões já tomadas listadas acima sem confirmação explícita do usuário
