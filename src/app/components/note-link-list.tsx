import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { NoteSummary } from "@/app/lib/api";

export type NoteLinkListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

/** Menu de sugestões que abre ao digitar `[[` no editor. */
export function NoteLinkList({
  ref,
  items,
  loading,
  query,
  command,
}: {
  ref?: React.Ref<NoteLinkListHandle>;
  items: NoteSummary[];
  loading: boolean;
  query: string;
  command: (note: NoteSummary) => void;
}) {
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Nova lista: volta a destacar o primeiro item.
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setSelected(0);
  }

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useImperativeHandle(ref, () => ({
    onKeyDown(event) {
      if (items.length === 0) return false;
      if (event.key === "ArrowDown") {
        setSelected((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        const note = items[selected];
        if (note) command(note);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[8px] border-2 border-ink bg-card shadow-hard">
      <p className="border-b-2 border-ink bg-sand px-3 py-1.5 text-[0.7rem] font-black uppercase tracking-[0.08em]">
        Link para nota
      </p>

      {items.length === 0 ? (
        <p className="px-3 py-2.5 text-[0.85rem] text-muted">
          {loading
            ? "Buscando…"
            : query.trim()
              ? `Nenhuma nota com “${query.trim()}”`
              : "Nenhuma outra nota ainda"}
        </p>
      ) : (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Notas para linkar"
          className="max-h-64 overflow-y-auto p-1"
        >
          {items.map((note, index) => (
            <li
              key={note.id}
              role="option"
              aria-selected={index === selected}
              data-index={index}
              // mousedown + preventDefault: não tira o foco do editor.
              onMouseDown={(e) => {
                e.preventDefault();
                command(note);
              }}
              onMouseEnter={() => setSelected(index)}
              className="cursor-pointer truncate rounded-[5px] px-2.5 py-1.5 text-[0.9rem] font-bold aria-selected:bg-peach"
            >
              {note.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
