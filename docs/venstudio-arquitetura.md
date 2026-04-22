# VenStudio — Arquitetura e Guardrails

## Status: V2 IMPLEMENTADO — Stability AI (abril 2026)

### Engine atual: Stability AI Replace Background & Relight

Pipeline V2 usa a API `replace-background-and-relight` da Stability AI, que:
1. **Segmenta** automaticamente o subject (veículo)
2. **Gera** novo background a partir de prompt
3. **Relights** o subject para integrar com o novo fundo
4. **Preserva** o subject original (parâmetro `preserve_original_subject: 0.95`)

### Arquivos V2 (Stability AI)
- `api/venstudio/processar.ts` — Endpoint principal (POST, auth, Stability API, fingerprint, upload)
- `api/venstudio/status.ts` — Polling endpoint para processamento async (GET)
- `src/lib/venstudio-cenarios-v2.ts` — 4 cenários com prompts e parâmetros
- `src/hooks/useVenStudioV2.ts` — Hook React (processar, polling, cancelar, resetar)
- `supabase/migrations/023_stability_engine.sql` — Colunas engine_used, generation_id, etc.
- `public/images/cenarios/*.svg` — Thumbnails dos cenários

### 4 Cenários V2
| ID | Nome | Iluminação | Preserve |
|----|------|-----------|----------|
| `showroom` | Showroom Premium | above, 0.7 | 0.95 |
| `deserto` | Deserto | left, 0.8 | 0.95 |
| `neve` | Neve | above, 0.6 | 0.95 |
| `garagem_luxo` | Garagem de Luxo | above, 0.75 | 0.95 |

### Fluxo
```
Frontend POST /api/venstudio/processar
  → Auth → Baixar foto → pHash original → Insert processamento
  → Stability API (replace-background-and-relight)
  → Se 200: fingerprint + upload + resposta síncrona
  → Se 202: salvar generation_id, retornar processamento_id
    → Frontend poll GET /api/venstudio/status?id=X
    → Status pollar Stability → fingerprint → upload → resposta
```

### Validação: pHash Fingerprint
- Biblioteca: `blockhash-core` (256×256 resize, 16-bit hash)
- Threshold: `VENSTUDIO_PHASH_THRESHOLD` env var (default: 10)
- Hamming distance ≤ threshold → aprovado
- Hamming distance > threshold → rejeitado

---

## Código legado (preservado, não deletar)

Iterações anteriores que não deram certo:
- Tier B (Sharp + fundos curados): preservação 100% mas qualidade visual insuficiente
- Tier C (Flux Fill Pro): fingerprint rejeita 40-100% das fotos

Arquivos preservados:
- `api/venstudio/compor-base.ts` (Tier B)
- `api/venstudio/compor-premium-v2.ts` (Tier C)
- `api/venstudio/webhook-replicate.ts`
- `api/venstudio/job-status.ts`
- `src/lib/venstudio-cenarios.ts`
- `src/lib/venstudio-presets-v2.ts`
- `src/lib/venstudio-types-v2.ts`
- `src/hooks/useVenStudio.ts`
- `src/hooks/useVenStudioPremium.ts`
- `src/pages/VenStudioPremiumPage.tsx`
- Bucket `fundos-cenarios/` (24 fundos curados)
- Bucket `venstudio-processados/`
- Tabela `processamentos_ia`
- Migrações 010, 011, 020

---

## REGRA DE OURO (non-negotiable)

**A IA NUNCA toca no veiculo. Apenas no fundo.**

## Por que essa restricao existe

Em 2026-04 o pipeline baseado em GPT Image (modelo generativo) alterou
caracteristicas do veiculo: emblema redesenhado, farois com formato diferente,
rodas com design completamente diferente, placa com typo, linhas da lataria
alteradas, farois de neblina inventados. Isso configura propaganda enganosa
sob o CDC Art. 37 e Art. 66 (afirmacao falsa sobre produto).

A plataforma e solidariamente responsavel com o anunciante.

## Ajustes permitidos no veiculo

- Correção de brilho/contraste via curves/LUT (determinístico)
- Sharpening leve (unsharp mask)
- Nenhuma operação que regenere pixels

## Como a V2 garante preservação

1. Stability API `preserve_original_subject: 0.95` mantém o veículo intacto
2. pHash fingerprint compara antes/depois — rejeita se hamming > threshold
3. Tabela `processamentos_ia` registra todos os dados para auditoria
4. Threshold configurável via env para calibração futura
