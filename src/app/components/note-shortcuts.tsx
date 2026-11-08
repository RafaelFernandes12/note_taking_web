import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { createNote, searchNotes, type NoteSummary } from "@/app/lib/api";
import { currentPanes, flushPendingSaves } from "@/app/lib/note-panes";
import { openInPane } from "@/app/lib/note-tabs";

/** Ctrl (ou Cmd no Mac) sem outros modificadores. */
const isMod = (e: KeyboardEvent) =>
  (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;

/** Painel onde está o foco (`data-pane` do `<section>` da nota). */
function focusedPane() {
  return document.activeElement
    ?.closest("[data-pane]")
    ?.getAttribute("data-pane");
}

/**
 * Atalhos globais, no estilo do Obsidian:
 * - Ctrl+N: cria uma nota e abre no painel com foco;
 * - Ctrl+]: busca uma nota para abrir no painel ao lado.
 */
export function NoteShortcuts() {
  const navigate = useNavigate();
  const [switcher, setSwitcher] = useState<{
    mainId: number;
    exclude: number[];
    /** Onde estava o foco ao abrir (o editor), para devolver ao fechar. */
    returnFocus: HTMLElement | null;
  } | null>(null);
  const creating = useRef(false);

  useEffect(() => {
    async function newNote() {
      if (creating.current) return;
      creating.current = true;
      try {
        const id = await createNote();
        // Nova aba no painel com foco (o principal, se nenhum tiver).
        const pane = focusedPane() === "side" ? "side" : "main";
        const href = openInPane(pane, id, true);
        if (!href) return;
        await flushPendingSaves();
        navigate(href);
      } catch (error) {
        console.error("Falha ao criar a nota", error);
      } finally {
        creating.current = false;
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!isMod(event)) return;

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        void newNote();
        return;
      }

      // `code` cobre teclados em que o `]` muda de lugar.
      if (event.code === "BracketRight" || event.key === "]") {
        const { mainId, sideId } = currentPanes();
        if (!mainId) return; // só faz sentido dentro de uma nota
        event.preventDefault();
        setSwitcher({
          mainId,
          exclude: sideId ? [mainId, sideId] : [mainId],
          returnFocus: document.activeElement as HTMLElement | null,
        });
      }
    }

    // Captura: roda antes do editor tratar a tecla.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [navigate]);

  if (!switcher) return null;

  return (
    <QuickSwitcher
      exclude={switcher.exclude}
      onClose={() => {
        setSwitcher(null);
        switcher.returnFocus?.focus();
      }}
      onPick={async (note) => {
        setSwitcher(null);
        // Abre numa aba nova do painel ao lado (ou cria o painel).
        const href = openInPane("side", note.id, true);
        if (!href) return;
        await flushPendingSaves();
        navigate(href);
      }}
    />
  );
}

function QuickSwitcher({
  exclude,
  onPick,
  onClose,
}: {
  exclude: number[];
  onPick: (note: NoteSummary) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<NoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const notes = await searchNotes(query);
        if (!cancelled) {
          setItems(notes.filter((n) => !exclude.includes(n.id)));
          setSelected(0);
        }
      } catch (error) {
        console.error("Falha ao buscar notas", error);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, exclude]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-ink/20 px-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Abrir nota ao lado"
        className="w-full max-w-lg overflow-hidden rounded-[10px] border-2 border-ink bg-card shadow-hard-lg"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
              return;
            }
            if (items.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((i) => (i + 1) % items.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((i) => (i - 1 + items.length) % items.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              onPick(items[selected]);
            }
          }}
          placeholder="Abrir ao lado…"
          aria-label="Buscar nota para abrir ao lado"
          className="w-full border-b-2 border-ink bg-card px-4 py-3 text-[1.05rem] font-bold placeholder:text-muted focus:outline-none"
        />

        {items.length === 0 ? (
          <p className="px-4 py-3 text-[0.9rem] text-muted">
            {loading ? "Buscando…" : "Nenhuma nota encontrada"}
          </p>
        ) : (
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-[50vh] overflow-y-auto p-1.5"
          >
            {items.map((note, index) => (
              <li
                key={note.id}
                role="option"
                aria-selected={index === selected}
                data-index={index}
                onMouseMove={() => setSelected(index)}
                onClick={() => onPick(note)}
                className="cursor-pointer truncate rounded-[6px] px-3 py-2 text-[0.95rem] font-bold aria-selected:bg-peach"
              >
                {note.title}
              </li>
            ))}
          </ul>
        )}

        <p className="flex gap-4 border-t-2 border-ink bg-sand px-4 py-1.5 text-[0.72rem] font-bold text-muted">
          <span>↑↓ navegar</span>
          <span>↵ abrir ao lado</span>
          <span>esc fechar</span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
