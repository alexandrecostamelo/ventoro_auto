# CLAUDE.md — Instruções para Claude Code

> Leia este arquivo e o VENTORO.md antes de qualquer tarefa neste projeto.

---

## Projeto

**Ventoro** — marketplace premium de veículos com IA integrada.
Leia `VENTORO.md` na raiz para o contexto completo do produto, marca, stack e decisões tomadas.

---

## Fluxo de trabalho

Antes de qualquer tarefa:
1. Ler `VENTORO.md` — contexto do produto e decisões
2. Verificar a estrutura de pastas atual — não criar duplicatas
3. Verificar `src/data/mock.ts` — entender os dados disponíveis
4. Verificar o componente relevante em `src/components/` antes de criar um novo

Ao finalizar uma tarefa:
1. Confirmar que nenhuma variável CSS foi hardcoded como hex
2. Confirmar que nenhum dado foi hardcoded na tela (sempre de `mock.ts`)
3. Se criou um componente ou rota nova, atualizar `VENTORO.md`

---

## Regras absolutas

- Nunca hardcodar cores — sempre `var(--color-brand-primary)` etc.
- Nunca hardcodar dados nas telas — sempre `import` de `src/data/mock.ts`
- Nunca mudar nome da marca, cores principais ou fontes sem confirmação
- Nunca criar componente de logo que não use `<VentoroLogo />`
- Nunca criar chamadas reais de API — fase atual é 100% mock
- Sempre formatar valores monetários e numéricos no padrão pt-BR
- Sempre escrever TypeScript — sem arquivos `.js` no `src/`

---

## Stack resumida

```
React + TypeScript + Vite
Tailwind CSS + variáveis CSS customizadas
React Router DOM
Recharts (gráficos)
Sem backend — dados em src/data/mock.ts
```

---

## Contexto rápido de componentes críticos

```
VentoroLogo     src/components/VentoroLogo.tsx      — logo oficial
ThemeToggle     src/components/ThemeToggle.tsx       — dark/light mode
ThemeContext    src/contexts/ThemeContext.tsx         — tema global
mock.ts         src/data/mock.ts                     — todos os dados
```

---

## Quando atualizar VENTORO.md

- Nova rota adicionada
- Novo componente importante criado
- Nova decisão de produto tomada
- Convenção nova estabelecida
- Integração nova planejada ou implementada
