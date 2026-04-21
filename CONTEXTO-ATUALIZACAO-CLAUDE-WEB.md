# Ventoro — Atualização de Contexto (Abril 2026)

> Documento para atualizar o Claude web sobre todo o progresso recente do projeto Ventoro.
> Cobre: Supabase real, Auth, VenStudio V2, Admin Dashboard, migrações, Edge Functions.

---

## 1. Estado Atual do Projeto

O Ventoro saiu da fase "100% mock" e agora opera com **Supabase real** para auth, banco de dados, storage e Edge Functions. O frontend React+Vite+TypeScript continua no mesmo stack, mas agora se conecta ao Supabase backend.

**Projeto Supabase:** `flhrbrnuwkpcdsnplibo` (região us-west-2)
**Deploy:** Vercel (frontend + API serverless functions)

---

## 2. Supabase — Migrações Aplicadas (001–021)

| # | Arquivo | Função |
|---|---------|--------|
| 001 | `001_initial_schema.sql` | Schema inicial: profiles, garagens, veiculos, fotos_veiculos, leads, assinaturas, pagamentos, processamentos_ia |
| 002 | `002_storage_buckets.sql` | Buckets: fotos-veiculos, fotos-perfil, documentos |
| 003 | `003_rpc_incrementar_visualizacao.sql` | RPC para incrementar contagem de visualização |
| 004 | `004_garagens_veiculos_extras.sql` | Colunas extras em garagens e veículos |
| 005 | `005_visualizacoes_diarias.sql` | Tabela visualizacoes_diarias para métricas |
| 006 | `006_rpc_incrementar_com_snapshot.sql` | RPC melhorada com snapshot diário |
| 007 | `007_rls_visualizacoes_garagem.sql` | RLS para visualizações da garagem |
| 008 | `008_aceita_troca.sql` | Campo aceita_troca em veículos |
| 009 | `009_security_definer_historico_preco.sql` | SECURITY DEFINER em registrar_historico_preco para bypass de RLS |
| 010 | `010_processamentos_ia_audit.sql` | Colunas de auditoria em processamentos_ia |
| 011 | `011_veiculos_caracteristicas_visuais.sql` | Campos para características visuais dos veículos |
| 012a | `012_notificacoes.sql` | Tabela de notificações |
| 012b | `012_buckets_venstudio_v2.sql` | Bucket venstudio-processados |
| 013 | `013_stripe_assinaturas.sql` | Integração Stripe com assinaturas |
| 014 | `014_destaque_ate.sql` | Campo destaque_ate em veículos |
| 015 | `015_uso_ia.sql` | Tabela uso_ia para rate limiting |
| 016 | `016_cache_fipe.sql` | Cache de consultas FIPE |
| 017 | `017_inspecao_visual.sql` | Tabela para inspeção visual IA |
| 018 | `018_criativos_ads.sql` | Tabela para criativos de marketing |
| 020 | `020_premium_v2_jobs.sql` | Colunas para pipeline VenStudio Premium V2 (replicate_prediction_id, tentativas, seed, etc.) |
| 021 | `021_admin_logs_e_rls.sql` | Tabela logs_admin + RLS admin em todas as tabelas |

---

## 3. Tabelas Principais no Banco

```
profiles            — id, email, nome, tipo (admin/garagem/particular/comprador), cidade, estado, garagem_id
garagens            — id, nome, slug, cnpj, plano (starter/pro/premium), ativa, verificada, cnpj_verificado, score_confianca
veiculos            — id, titulo, slug, marca, modelo, ano, preco, status (rascunho/publicado/vendido), fotos, specs completas
fotos_veiculos      — id, veiculo_id, url, posicao, tipo
leads               — id, veiculo_id, garagem_id, nome, telefone, email, mensagem, status (novo/contatado/convertido)
assinaturas         — id, garagem_id, plano, status (ativa/trial/cancelada/inadimplente/expirada), valor_mensal, stripe_subscription_id
pagamentos          — id, tipo, plano, valor, status (pendente/pago/falhou), metodo, anunciante_id, garagem_id
processamentos_ia   — id, veiculo_id, foto_id, tipo (tier_b/tier_c), cenario, status (processando/concluido/erro), url_processada, replicate_prediction_id, tentativas, seed, hamming_distance, aprovado
uso_ia              — id, user_id, tipo, tokens_usados, created_at
logs_admin          — id, acao, entidade, entidade_id, admin_id, admin_email, detalhes (jsonb), created_at
notificacoes        — id, user_id, tipo, titulo, mensagem, lida, created_at
```

---

## 4. Auth e Perfis

- **Provider:** Supabase Auth (email/password)
- **Context:** `src/contexts/AuthContext.tsx` — provê user, profile, loading, signIn, signUp, signOut
- **Hook useAuth:** retorna { user, profile, loading, signIn, signUp, signOut }
- **Hook useAdmin:** retorna { user, profile, isAdmin, loading } — verifica `profile.tipo === 'admin'`
- **Perfis de usuário:** comprador, particular, garagem, admin
- **Usuário admin de teste:** `joao.particular@ventoro-teste.com` (tipo=admin)

---

## 5. VenStudio — Arquitetura de 3 Tiers

### Tier A — Remoção de Fundo
- Remove background do veículo usando segmentação
- Gera PNG transparente do veículo isolado

### Tier B — Composição Determinística (Sharp)
- Composição em Node.js com Sharp (sem IA)
- Background pré-renderizado + veículo + sombra SVG ellipse adaptativa
- 5 cenários: showroom_escuro, estudio_branco, garagem_premium, urbano_noturno, neutro_gradiente
- **Sombra adaptativa por cenário:** cada cenário tem cor, opacidade, blur e blend mode próprios
  - Fundos escuros (showroom, garagem, urbano): blend `multiply`, sombra preta
  - Fundos claros (estúdio): blend `over`, sombra `#333333`
  - Neutro gradiente: blend `over`, sombra preta com opacidade média

### Tier C — Inpainting Premium (Flux Fill Pro via Replicate)
- Pipeline async: frontend → API cria job → Replicate com webhook → webhook valida pHash → resultado
- Mesmos 5 cenários com prompts otimizados
- pHash threshold configurável (default: 10, env `VENSTUDIO_PHASH_THRESHOLD`)
- Até 3 retries com seeds diferentes se pHash falhar
- Tabela processamentos_ia armazena prediction_id, tentativas, hamming_distance

### Edge Functions / API Routes (Vercel Serverless)

| Arquivo | Rota | Função |
|---------|------|--------|
| `api/venstudio/compor-base.ts` | POST | Tier B: composição determinística com Sharp |
| `api/venstudio/compor-premium-v2.ts` | POST | Tier C: cria job async no Replicate |
| `api/venstudio/webhook-replicate.ts` | POST | Tier C: recebe resultado do Replicate, valida pHash |
| `api/venstudio/job-status.ts` | GET | Polling de status do job Premium |
| `api/venstudio/health.ts` | GET | Health check |

### Presets V2 (src/lib/venstudio-presets-v2.ts)

| ID | Nome | Fundo |
|----|------|-------|
| `luxury_showroom` | Showroom de Luxo | Porcelanato escuro, LED lateral |
| `premium_studio` | Estúdio Premium | Branco infinito, softbox |
| `modern_garage` | Garagem Moderna | Concreto polido, luz quente |
| `urban_premium` | Urbano Premium | Asfalto molhado, neons |
| `neutro_gradiente` | Neutro | Gradiente escuro minimalista |

### Frontend VenStudio

| Arquivo | Função |
|---------|--------|
| `src/pages/VenStudioPage.tsx` | VenStudio Tier B (standalone) |
| `src/pages/VenStudioPremiumPage.tsx` | VenStudio Premium V2 (Tier C) |
| `src/hooks/useVenStudioPremium.ts` | Hook: upload → job → polling → resultado |
| `src/components/venstudio/UploadArea.tsx` | Drag & drop + preview |
| `src/components/venstudio/StyleSelector.tsx` | Grid de presets visuais |
| `src/components/venstudio/ProcessingStatus.tsx` | Spinner + progresso |
| `src/components/venstudio/ResultViewer.tsx` | Before/after + download |
| `src/lib/venstudio-types-v2.ts` | Types do pipeline V2 |
| `src/lib/venstudio-presets-v2.ts` | Configs dos 5 presets |
| `src/lib/venstudio-cenarios.ts` | Configs dos 5 cenários Tier B (com sombra adaptativa) |

---

## 6. Painel Administrativo (Admin Dashboard)

### Arquitetura

- **Guard:** `useAdmin()` hook verifica `profiles.tipo === 'admin'`
- **Layout:** `src/components/admin/AdminLayout.tsx` — sidebar fixa desktop, slide-out mobile, badge admin vermelho
- **Data hooks:** `src/hooks/useAdminData.ts` — 5 hooks com dados reais do Supabase

### Rotas Admin

```
/admin                → AdminDashboard (KPIs globais)
/admin/usuarios       → AdminUsuarios (CRUD usuários)
/admin/garagens       → AdminGaragens (CRUD garagens)
/admin/assinaturas    → AdminAssinaturas (gestão assinaturas)
/admin/financeiro     → AdminFinanceiro (pagamentos)
/admin/logs           → AdminLogs (auditoria)
/admin/configuracoes  → AdminConfiguracoes (planos e parâmetros)
```

### Páginas e Funcionalidades

| Página | Arquivo | Funcionalidades |
|--------|---------|-----------------|
| Dashboard | `src/pages/admin/AdminDashboard.tsx` | KPI cards (MRR, Receita, Assinaturas, Churn, Usuários, Garagens, Veículos, Leads), alertas de inadimplência |
| Usuários | `src/pages/admin/AdminUsuarios.tsx` | Busca, filtro por tipo, tabela com ações (tornar admin, rebaixar, reset senha) |
| Garagens | `src/pages/admin/AdminGaragens.tsx` | Busca, filtro por plano, ações (verificar, alterar plano, ativar/desativar) |
| Assinaturas | `src/pages/admin/AdminAssinaturas.tsx` | Busca, filtro por status, ações (reativar, cancelar, migrar plano) |
| Financeiro | `src/pages/admin/AdminFinanceiro.tsx` | KPIs financeiros, tabela de pagamentos com filtro por status |
| Logs | `src/pages/admin/AdminLogs.tsx` | Tabela de logs_admin com filtro, auto-populated conforme ações admin |
| Configurações | `src/pages/admin/AdminConfiguracoes.tsx` | Cards de planos, parâmetros do sistema, info da stack |

### RLS Admin (migration 021)

Policies admin em todas as tabelas:
- **SELECT** em: profiles, garagens, assinaturas, pagamentos, veiculos, leads, processamentos_ia, uso_ia, logs_admin
- **UPDATE** em: profiles, garagens, assinaturas, veiculos
- **INSERT** em: logs_admin
- Todas verificam `profiles.tipo = 'admin'` via subquery

---

## 7. Estrutura de Rotas Completa (atualizada)

```
# Marketplace público
/                              Home
/buscar                        Resultados de busca
/veiculo/:slug                 Detalhe do veículo
/veiculo/:slug/landing         Landing page inteligente
/garagem/:slug                 Perfil público da garagem
/comparar                      Comparador
/pedido-de-busca               Marketplace reverso
/favoritos                     Favoritos (auth)
/alertas                       Alertas (auth)
/notificacoes                  Notificações (auth)
/entrar                        Login
/cadastrar                     Cadastro

# Dashboard particular
/minha-conta                   Home
/minha-conta/anuncios          Anúncios
/minha-conta/leads             Leads
/minha-conta/metricas          Métricas
/minha-conta/configuracoes     Configurações

# Dashboard garagem
/painel                        Home
/painel/estoque                Inventário
/painel/leads                  CRM Kanban
/painel/vitrine                Vitrine
/painel/equipe                 Equipe
/painel/marketing              Marketing
/painel/relatorios             Relatórios
/painel/planos                 Planos e cobrança

# VenStudio
/studio                        VenStudio Tier B
/studio-pro                    VenStudio Premium V2 (Tier C)

# Admin
/admin                         Dashboard
/admin/usuarios                Gestão de usuários
/admin/garagens                Gestão de garagens
/admin/assinaturas             Assinaturas
/admin/financeiro              Financeiro
/admin/logs                    Logs de auditoria
/admin/configuracoes           Configurações do sistema

# Outros
/anunciar                      Wizard publicação de anúncio
/inspecionar/:slug             Inspeção visual IA
```

---

## 8. Env Vars em Uso

```
# Frontend (Vite)
VITE_SUPABASE_URL              URL pública do Supabase
VITE_SUPABASE_ANON_KEY         Chave anon do Supabase

# Backend (Vercel serverless)
SUPABASE_URL                   URL do Supabase (service)
SUPABASE_SERVICE_ROLE_KEY      Service role key
REPLICATE_API_TOKEN            Token da API Replicate

# Opcionais
VENSTUDIO_PHASH_THRESHOLD      Threshold pHash (default: 10)
VENSTUDIO_WEBHOOK_SECRET       Validação de webhook Replicate
```

---

## 9. Planos e Preços (garagens)

| Plano | Preço/mês | Veículos | Destaques | VenStudio | Features |
|-------|-----------|----------|-----------|-----------|----------|
| Starter | R$ 99,90 | 10 | 0 | Sem | Relatórios básicos |
| Pro | R$ 299,90 | 30 | 5/mês | Tier B (30/mês) | Relatórios completos, alertas, badge Pro |
| Premium | R$ 499,90 | Ilimitados | Ilimitados | Tier B+C (50/mês) | Tudo + ranking prioritário, badge Premium, suporte |

---

## 10. Arquivos-Chave do Projeto

```
# Config
CLAUDE.md                                    Instruções para Claude Code
VENTORO.md                                   Knowledge base do produto
vercel.json                                  Config Vercel (rewrites API)
tsconfig.json                                TypeScript config

# Auth & Context
src/contexts/AuthContext.tsx                  Auth provider (Supabase)
src/contexts/ThemeContext.tsx                 Theme provider (dark/light)
src/lib/supabase.ts                          Supabase client

# Hooks
src/hooks/useAdmin.ts                        Hook admin guard
src/hooks/useAdminData.ts                    Hooks dados admin (5 hooks)
src/hooks/useVenStudioPremium.ts             Hook VenStudio Premium V2
src/hooks/usePlanLimits.ts                   Limites por plano

# Admin
src/components/admin/AdminLayout.tsx         Layout sidebar admin
src/pages/admin/AdminDashboard.tsx           Dashboard KPIs
src/pages/admin/AdminUsuarios.tsx            CRUD usuários
src/pages/admin/AdminGaragens.tsx            CRUD garagens
src/pages/admin/AdminAssinaturas.tsx         Gestão assinaturas
src/pages/admin/AdminFinanceiro.tsx          Pagamentos
src/pages/admin/AdminLogs.tsx                Logs auditoria
src/pages/admin/AdminConfiguracoes.tsx       Config sistema

# VenStudio
api/venstudio/compor-base.ts                Tier B (Sharp)
api/venstudio/compor-premium-v2.ts          Tier C (Replicate async)
api/venstudio/webhook-replicate.ts          Webhook Replicate
api/venstudio/job-status.ts                 Polling status
src/lib/venstudio-cenarios.ts               Cenários Tier B
src/lib/venstudio-presets-v2.ts             Presets Tier C
src/lib/venstudio-types-v2.ts               Types V2

# Utils
src/utils/planLimits.ts                     Limites de features por plano
src/data/mock.ts                            Dados mockados (ainda usado em telas públicas)
```

---

## 11. Pendências / Próximos Passos

### VenStudio
- [ ] **Prioridade 2:** Ajustar composição Tier B (fix top crop 56px com yRatio, color matching por cenário)
- [ ] **Prioridade 3:** Documentar threshold pHash 10, arquitetura async para produção
- [ ] **Prioridade 4:** Integrar VenStudio no wizard de publicação (step 3), /studio standalone com fallback
- [ ] **Prioridade 5:** Release (docs, git tag, commit, push)

### Admin
- [ ] Implementar logging de ações admin na tabela logs_admin (INSERT ao executar ações)
- [ ] Criar tabela `configuracoes_sistema` para salvar parâmetros (hoje hardcoded)
- [ ] Implementar paginação nas tabelas admin (hoje limit 500)
- [ ] Adicionar gráficos no dashboard admin (receita mensal, crescimento)

### Geral
- [ ] Integração Stripe real para pagamentos (checkout + webhooks)
- [ ] Integração Pix via Asaas para pagamentos complementares
- [ ] Busca avançada com Typesense/Elasticsearch
- [ ] Supabase Realtime para notificações em tempo real
- [ ] Pipeline CI/CD para deploy automatizado

---

## 12. Decisões Técnicas Recentes

1. **VenStudio V1 (GPT Image) foi descartada** — pipeline V1 usava GPT-4 Vision que não existe mais. V2 usa Replicate Flux Fill Pro.
2. **Sombra adaptativa** — cada cenário tem cor/opacidade/blur/blend próprios. Fundos escuros usam `multiply`, claros usam `over`.
3. **luxury_outdoor removido** — o preset de exterior foi substituído por `neutro_gradiente` (gradiente escuro minimalista) por decisão do product owner.
4. **pHash threshold = 10** — valores ≤2 são incompatíveis com inpainting. 10 aprova resultados bons, 13+ detecta troca de veículo.
5. **Admin usa Supabase real** — não mock. Todas as queries vão direto ao banco com RLS admin policies.
6. **Admin guard duplo** — useAdmin hook (frontend) + RLS policies (banco). Mesmo que alguém burle o frontend, o banco bloqueia.
