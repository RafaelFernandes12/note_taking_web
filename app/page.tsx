import { Suspense } from "react";
import { AppHeader } from "@/app/components/app-header";
import { NewNoteButton } from "@/app/components/new-note-button";
import { NotesList } from "@/app/components/notes-list";

export default function Home() {
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

        <Suspense
          fallback={
            <p className="text-xs font-black uppercase tracking-[0.08em] text-muted">
              Carregando notas…
            </p>
          }
        >
          <NotesList />
        </Suspense>
      </main>
    </>
  );
}
