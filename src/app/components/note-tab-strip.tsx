import { useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { createNote } from "@/app/lib/api";
import {
  flushPendingSaves,
  parseSideId,
  SIDE_PARAM,
  type Pane,
} from "@/app/lib/note-panes";
import {
  closePane,
  closeTab,
  openInPane,
  setFocusedPane,
  setTabTitle,
  showTab,
  swapPanes,
  syncPane,
  useNoteTabs,
} from "@/app/lib/note-tabs";
import { UNTITLED } from "@/app/lib/note-text";

/**
 * Fica dentro de cada painel e avisa a faixa de abas qual nota ele mostra.
 * Não desenha nada.
 */
export function PaneTabSync({
  pane,
  noteId,
  title,
  split,
}: {
  pane: Pane;
  noteId: number;
  /** Título vindo do servidor, até o editor atualizar enquanto digita. */
  title: string;
  split: boolean;
}) {
  useEffect(() => {
    setTabTitle(noteId, title);
    syncPane(pane, noteId);
    if (pane === "main" && !split) syncPane("side", null);
  }, [pane, noteId, title, split]);
  return null;
}

/** Faixa única de abas no topo, compartilhada pelos dois painéis. */
export function NoteTabStrip() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const tabs = useNoteTabs();
  const stripRef = useRef<HTMLDivElement>(null);

  const mainId = Number(params.id);
  const sideId = parseSideId(searchParams.get(SIDE_PARAM) ?? undefined, mainId);
  const split = sideId !== null;

  // As notas na tela sempre aparecem, mesmo antes do localStorage carregar.
  const ids = [...tabs.ids];
  for (const id of [mainId, sideId]) {
    if (id && !ids.includes(id)) ids.push(id);
  }

  // Lembra o último painel com foco: clicar numa aba abre nele.
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const pane = (event.target as HTMLElement | null)
        ?.closest?.("[data-pane]")
        ?.getAttribute("data-pane");
      if (pane === "main" || pane === "side") setFocusedPane(pane);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  // A aba da nota principal sempre à vista.
  useEffect(() => {
    stripRef.current
      ?.querySelector(`[data-tab="${mainId}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [mainId]);

  async function go(href: string | null) {
    if (!href) return;
    await flushPendingSaves();
    navigate(href);
  }

  async function newTab() {
    try {
      const id = await createNote();
      await go(openInPane(split ? tabs.focused : "main", id, true));
    } catch (error) {
      console.error("Falha ao criar a nota", error);
    }
  }

  const iconButton =
    "grid size-8 shrink-0 cursor-pointer place-items-center rounded-[5px] text-[1rem] font-black leading-none hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

  return (
    <div className="flex min-w-0 flex-1 items-end gap-1">
      <div
        ref={stripRef}
        role="tablist"
        aria-label="Notas abertas"
        className="flex min-w-0 flex-1 items-end overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ids.map((id) => {
          const where: Pane | null =
            id === mainId ? "main" : id === sideId ? "side" : null;
          const label = tabs.titles[id]?.trim() || UNTITLED;
          return (
            <div
              key={id}
              data-tab={id}
              className={
                "group -mb-0.5 flex h-9 w-48 min-w-24 shrink items-center gap-1.5 rounded-t-[7px] border-2 pl-3 pr-1 " +
                (where
                  ? "border-ink border-b-paper bg-paper"
                  : "border-transparent hover:bg-paper/50")
              }
            >
              {split && where && (
                <PaneIcon pane={where} />
              )}
              <button
                type="button"
                role="tab"
                aria-selected={where !== null}
                title={
                  where === "side"
                    ? `${label} (painel ao lado)`
                    : where === "main"
                      ? `${label} (painel principal)`
                      : label
                }
                onClick={() => void go(showTab(id))}
                // Botão do meio fecha, como no navegador.
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    void go(closeTab(id));
                  }
                }}
                className={
                  "min-w-0 flex-1 cursor-pointer truncate text-left text-[0.84rem] focus-visible:outline-none " +
                  (where ? "font-black" : "font-bold text-muted")
                }
              >
                {label}
              </button>
              <button
                type="button"
                onClick={() => void go(closeTab(id))}
                aria-label={`Fechar a aba ${label}`}
                title="Fechar aba"
                className={
                  "grid size-6 shrink-0 cursor-pointer place-items-center rounded-[4px] text-[1rem] leading-none hover:bg-peach focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink " +
                  (where ? "" : "opacity-0 group-hover:opacity-100")
                }
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="mb-0.5 flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => void newTab()}
          aria-label="Nova nota em nova aba"
          title="Nova nota em nova aba (Ctrl+N)"
          className={iconButton}
        >
          +
        </button>
        {split && (
          <>
            <button
              type="button"
              onClick={() => void go(swapPanes())}
              aria-label="Trocar os painéis de lado"
              title="Trocar os painéis de lado"
              className={iconButton + " hidden md:grid"}
            >
              ⇄
            </button>
            <button
              type="button"
              onClick={() => void go(closePane("side"))}
              aria-label="Fechar o painel ao lado"
              title="Fechar o painel ao lado (a aba continua aberta)"
              className={iconButton + " hidden md:grid"}
            >
              <PaneIcon pane="side" crossed />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Ícone de janela com a metade do painel preenchida. */
function PaneIcon({ pane, crossed }: { pane: Pane; crossed?: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
      className="shrink-0"
    >
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <rect
        x={pane === "main" ? 2.5 : 12}
        y="4"
        width="9.5"
        height="16"
        fill="currentColor"
        stroke="none"
      />
      {crossed && <path d="M14.5 9.5l5 5m0-5l-5 5" stroke="var(--color-card, #fff)" strokeWidth="2.5" />}
    </svg>
  );
}
