import { data, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { AppHeader } from "@/app/components/app-header";
import { NewNoteButton } from "@/app/components/new-note-button";
import { NoteEditor } from "@/app/components/note-editor";
import { getNote, listTags, type Tag } from "@/app/lib/api";

/** Busca a nota e as tags antes de mostrar a página. */
export async function noteLoader({ params, request }: LoaderFunctionArgs) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw data("Nota inválida", { status: 404 });

  const [note, knownTags] = await Promise.all([
    getNote(id, request.signal),
    // Sem a lista de tags a nota ainda abre; só perde as sugestões.
    listTags(request.signal).catch((): Tag[] => []),
  ]);
  if (!note) throw data("Nota não encontrada", { status: 404 });
  return { note, knownTags };
}

export function NotePage() {
  const { note, knownTags } = useLoaderData<typeof noteLoader>();

  return (
    <>
      <AppHeader>
        <NewNoteButton />
      </AppHeader>
      <main className="flex flex-1 flex-col">
        <NoteEditor
          // Outra nota, outro editor (o Tiptap só lê o conteúdo ao ser criado).
          key={note.id}
          id={note.id}
          initialContent={note.content}
          initialTags={note.tags ?? []}
          knownTags={knownTags}
        />
      </main>
    </>
  );
}
