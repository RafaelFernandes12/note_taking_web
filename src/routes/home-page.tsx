import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { AppHeader } from "@/app/components/app-header";
import { NewNoteButton } from "@/app/components/new-note-button";
import { NotesList } from "@/app/components/notes-list";
import { listNotes } from "@/app/lib/api";

/** Busca as notas antes de mostrar a página. */
export async function homeLoader({ request }: LoaderFunctionArgs) {
  return listNotes("", 100, request.signal);
}

export function HomePage() {
  const { notes, total } = useLoaderData<typeof homeLoader>();

  return (
    <>
      <AppHeader>
        <NewNoteButton />
      </AppHeader>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-muted">
            Caderno
          </p>
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Escreva antes que{" "}
            <span className="bg-peach px-1 box-decoration-clone">
              a ideia fuja
            </span>
            .
          </h1>
        </div>

        <NotesList pages={notes} total={total} />
      </main>
    </>
  );
}
