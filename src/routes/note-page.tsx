import { data, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { AppLogo } from "@/app/components/app-header";
import { NoteEditor } from "@/app/components/note-editor";
import { NoteTabStrip, PaneTabSync } from "@/app/components/note-tab-strip";
import { getNote, listTags, type Note, type Tag } from "@/app/lib/api";
import { noteTitle, UNTITLED } from "@/app/lib/note-text";
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
  const split = panes.length === 2;

  return (
    // Em telas largas a página tem a altura da janela e cada painel rola sozinho.
    <div className="flex flex-1 flex-col md:h-dvh">
      {/* Faixa única de abas no topo, para os dois painéis (como no Obsidian).
          Nova nota é Ctrl+N (ou o +) e abrir ao lado é Ctrl+]. */}
      <header className="flex shrink-0 items-end gap-3 border-b-2 border-ink bg-sand pl-3 pr-2 pt-2">
        <div className="mb-1.5">
          <AppLogo compact />
        </div>
        <NoteTabStrip />
      </header>
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
            <PaneTabSync
              pane={pane}
              noteId={page.id}
              // O H1 é o título de verdade; o `title` salvo pode estar atrasado.
              title={
                noteTitle(page.content) !== UNTITLED
                  ? noteTitle(page.content)
                  : page.title?.trim() || UNTITLED
              }
              split={split}
            />
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
