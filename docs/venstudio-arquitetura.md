# VenStudio — Arquitetura e Guardrails

## REGRA DE OURO (non-negotiable)

**A IA NUNCA toca no veiculo. Apenas no fundo.**

## Por que essa restricao existe

Em 2026-04 o pipeline baseado em GPT Image (modelo generativo) alterou
caracteristicas do veiculo: emblema redesenhado, farois com formato diferente,
rodas com design completamente diferente, placa com typo, linhas da lataria
alteradas, farois de neblina inventados. Isso configura propaganda enganosa
sob o CDC Art. 37 e Art. 66 (afirmacao falsa sobre produto).

A plataforma e solidariamente responsavel com o anunciante.

## Arquitetura aprovada (pipeline deterministico v2)

1. **Segmentacao**: BiRefNet/RMBG -> PNG transparente do veiculo ORIGINAL
2. **Fundo**: biblioteca pre-gerada (IA so aqui, UMA vez, offline)
3. **Composicao**: Sharp/canvas deterministico (pixel-perfect)
4. **Validacao**: fingerprint perceptual (pHash), hamming distance <= 2
5. **Auditoria**: tabela `processamentos_ia` com log completo

## Arquitetura PROIBIDA

- Enviar foto do veiculo para GPT Image, Imagen, Flux, Stable Diffusion, Midjourney
- Pipelines de "image-to-image" com prompt
- Qualquer variacao que permita IA "reimaginar" pixels do veiculo
- Inpainting, outpainting ou qualquer edicao generativa na regiao do veiculo

## Como adicionar novo cenario

1. Gerar 5 fundos via IA (UMA vez, revisar visualmente, SEM veiculo)
2. Subir em bucket `fundos-cenarios/{novo_cenario}_01.jpg` ate `_05.jpg`
3. Adicionar chave em CENARIOS_VENSTUDIO
4. NUNCA gerar fundo "na hora" durante processamento do usuario

## Ajustes permitidos no veiculo

- Correcao de brilho/contraste via curves/LUT (deterministico)
- Sharpening leve (unsharp mask)
- Nenhuma operacao que regenere pixels

## Reabilitar VenStudio em producao SOMENTE apos

1. Pipeline deterministic implementado e testado
2. Bateria de 50 testes (10 fotos x 5 cenarios) com 100% aprovacao visual
3. Fingerprint validation passando em todos os casos
4. Sign-off explicito do owner do produto
5. UI explicita "veiculo preservado pixel a pixel"
