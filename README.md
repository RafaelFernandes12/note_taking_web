# note_taking_web

Front do app de notas (Vite + React + Tiptap). O backend Spring fica em
`../notes_projeto`.

```bash
bun install
bun dev        # http://localhost:3000 — precisa do Spring rodando em :8080
bun run build  # gera dist/
```

Em desenvolvimento o Vite repassa `/api/*` para `http://localhost:8080`.
Todas as chamadas ao backend estão em `src/app/lib/api.ts`.
