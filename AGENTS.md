## Stack

Front do app de notas: **Vite + React 19 + React Router 8** (SPA), editor Tiptap,
desenhos com Excalidraw, Tailwind 4 + SCSS do template do Tiptap.

- `src/routes/` — páginas. Cada rota tem um `loader` que busca os dados antes
  de renderizar (`src/router.tsx` liga caminhos, loaders e páginas).
- `src/app/` — código do app (componentes, lógica de abas/painéis, tema).
- `src/app/lib/api.ts` — **todas** as chamadas ao backend. Mudou um endpoint no
  Spring? É aqui que o front acompanha.
- `src/components/`, `src/hooks/`, `src/lib/`, `src/styles/` — template do Tiptap
  (gerado pela CLI deles). Mexa só quando precisar; o ESLint relaxa algumas
  regras do React Compiler nessas pastas.

## Backend

O backend é Spring (repo irmão `../notes_projeto`), cuidado pelo dono do projeto
para aprender Java: **não altere o backend** sem ele pedir. Se o front precisar
de algo novo do backend, diga exatamente o que (endpoint, request, response).

O front só usa caminhos relativos `/api/...`. Em desenvolvimento o Vite repassa
`/api` para `http://localhost:8080` (`vite.config.ts`); no app desktop (JCEF) o
próprio Spring vai servir o front, então tudo fica na mesma origem, sem CORS.

## Rodando

```bash
bun install
bun dev        # http://localhost:3000 (precisa do Spring em :8080)
bun run build  # gera dist/, que o Spring vai servir
bun run lint
```

## Referência visual da UI

O visual do app segue este site: https://builderloo.ca/events/677-defence-sector-awareness-and-supply-chain-workshop

Antes de criar ou mudar telas e componentes, use essa página como referência de
estilo (tipografia, cores, bordas, sombras, espaçamento). Os tokens do tema ficam
em `src/app/notes-theme.css` e `src/app/globals.css`.
