# Ventoro — CLAUDE.md

## Projeto
Ventoro é um marketplace premium de veículos com IA integrada.
Site: ventoro.com.br

## Stack
- Frontend: React + TypeScript + Vite
- Estilização: Tailwind CSS + variáveis CSS customizadas
- Fontes: Syne (display), DM Sans (body), JetBrains Mono (dados)
- Roteamento: React Router DOM
- Gráficos: Recharts
- Dados: mock estático em src/data/mock.ts (sem backend ainda)

## Convenções
- Componentes em PascalCase: VehicleCard, VentoroLogo, GarageCard
- Hooks em camelCase com prefixo use: useVehicles, useFilters
- Arquivos de página em kebab-case: vehicle-detail.tsx, garage-profile.tsx
- Nunca usar dados hardcoded nas telas — sempre importar de src/data/mock.ts
- Sempre usar as variáveis CSS de cor (--color-brand-primary, etc)
- Fontes: Syne para títulos e preços, DM Sans para todo o resto

## Marca
- Nome: Ventoro
- Cor principal: #1D9E75 (Ventoro Green)
- Cor escura: #085041 (Deep Forest)
- Cor neutra: #0C0C0A (Asphalt)
- Tagline: "Seu próximo carro começa aqui."
- Tom: confiante, tecnológico, premium mas acessível

## Módulos de IA (nomenclatura)
- VenStudio IA — processamento de fotos
- Ventoro IA — copiloto de anúncio, análise de preço, chatbot
- AlertAI — sistema de alertas e matching
