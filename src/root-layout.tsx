import {
  isRouteErrorResponse,
  Link,
  Outlet,
  useRouteError,
} from "react-router";
import { NoteShortcuts } from "@/app/components/note-shortcuts";

/** Casca de todas as páginas: o conteúdo da rota e os atalhos globais. */
export function RootLayout() {
  return (
    <>
      <Outlet />
      <NoteShortcuts />
    </>
  );
}

/** Mostrado enquanto o primeiro loader roda. */
export function LoadingScreen() {
  return (
    <p className="mx-auto mt-16 text-xs font-black uppercase tracking-[0.08em] text-muted">
      Carregando…
    </p>
  );
}

/** Erros dos loaders: nota que não existe, backend fora do ar etc. */
export function ErrorScreen() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-start justify-center gap-4 px-4">
      <span className="rounded-[5px] bg-peach px-2 py-0.5 text-[0.72rem] font-extrabold uppercase tracking-[0.06em]">
        {notFound ? "404" : "Erro"}
      </span>
      <h1 className="text-3xl font-black tracking-tight">
        {notFound ? "Essa nota não existe." : "Não deu para carregar."}
      </h1>
      {!notFound && (
        <p className="text-[0.95rem] text-muted">
          O backend está rodando em localhost:8080?
        </p>
      )}
      <Link
        to="/"
        className="rounded-md border-2 border-ink bg-card px-4 py-2 font-bold shadow-hard"
      >
        Voltar para as notas
      </Link>
    </main>
  );
}
