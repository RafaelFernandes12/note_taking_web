import { data, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { AppHeader } from "@/app/components/app-header";
import { NewNoteButton } from "@/app/components/new-note-button";
import { NoteEditor } from "@/app/components/note-editor";
import { getNote, listTags, type Note, type Tag } from "@/app/lib/api";
import { parseSideId, SIDE_PARAM, type Pane } from "@/app/lib/note-panes";

/**
 * Busca a nota principal, a do lado (`?lado=`) e as tags antes de mostrar a
 * página. Roda de novo a cada navegação para outra nota ou outro `lado`.
 */
export async function noteLoader({ params, request }: LoaderFunctionArgs) {
  const mainId = Number(params.id);
  if (!Number.isInteger(mainId)) throw data("Nota inválida", { status: 404 });
  const url = new URL(request.url);
  const sideId = parseSideId(url.searchParams.get(SIDE_PARAM) ?? undefined, mainId);

  const [main, side, knownTags] = await Promise.all([
    getNote(mainId, request.signal),
    sideId ? getNote(sideId, request.signal) : null,
    // Sem a lista de tags a nota ainda abre; só perde as sugestões.
    listTags(request.signal).catch((): Tag[] => []),
  ]);
  if (!main) throw data("Nota não encontrada", { status: 404 });

  // Nota do lado que não existe mais: abre só a principal.
  return { main, side, knownTags };
}

export function NotePage() {
  const { main, side, knownTags } = useLoaderData<typeof noteLoader>();

  const panes: { pane: Pane; page: Note }[] = [{ pane: "main", page: main }];
  if (side) panes.push({ pane: "side", page: side });

  return (
    // Em telas largas a página tem a altura da janela e cada painel rola sozinho.
    <div className="flex flex-1 flex-col md:h-dvh">
      <AppHeader>
        <NewNoteButton />
      </AppHeader>
      <main className="flex flex-1 flex-col md:min-h-0 md:flex-row">
        {panes.map(({ pane, page }) => (
          <section
            // A chave é a nota: trocar a nota de um painel recria só aquele editor.
            key={page.id}
            aria-label={pane === "main" ? "Nota principal" : "Nota ao lado"}
            data-pane={pane}
            className={
              "note-pane relative flex min-w-0 flex-1 flex-col md:min-h-0" +
              // Abaixo de 768px não cabe lado a lado: mostra só a principal.
              (pane === "side" ? " hidden border-ink md:flex md:border-l-2" : "")
            }
          >
            <div className="note-pane-scroll flex flex-1 flex-col md:min-h-0 md:overflow-y-auto">
              <NoteEditor
                id={page.id}
                initialContent={page.content}
                initialTags={page.tags ?? []}
                knownTags={knownTags}
              />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
