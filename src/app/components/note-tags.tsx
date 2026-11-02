import { useId, useState } from "react";
import type { NoteTag } from "@/app/components/note-editor";
import { getOrCreateTag } from "@/app/lib/api";

/** Limpa o que foi digitado: tira `#`, espaços extras e pontas. */
function cleanTagName(raw: string) {
  return raw.replace(/^#+/, "").replace(/\s+/g, " ").trim();
}

const sameName = (a: string, b: string) =>
  a.toLocaleLowerCase("pt-BR") === b.toLocaleLowerCase("pt-BR");

export function NoteTags({
  tags,
  knownTags,
  onChange,
}: {
  tags: NoteTag[];
  /** Todas as tags que já existem, para sugerir no campo. */
  knownTags: NoteTag[];
  onChange: (tags: NoteTag[]) => void;
}) {
  const listId = useId();
  const [draft, setDraft] = useState("");
  const [known, setKnown] = useState(knownTags);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = known.filter(
    (tag) => !tags.some((t) => t.id === tag.id),
  );

  async function addTag(raw: string) {
    const name = cleanTagName(raw);
    setDraft("");
    setError(null);
    if (!name || tags.some((t) => sameName(t.name, name))) return;

    let tag = known.find((t) => sameName(t.name, name));
    if (!tag) {
      setPending(true);
      try {
        tag = await getOrCreateTag(name);
        const created = tag;
        setKnown((prev) =>
          prev.some((t) => t.id === created.id) ? prev : [...prev, created],
        );
      } catch {
        setError("Não foi possível adicionar a tag.");
        setDraft(name);
        return;
      } finally {
        setPending(false);
      }
    }
    onChange([...tags, tag]);
  }

  function removeTag(id: number) {
    onChange(tags.filter((t) => t.id !== id));
  }

  return (
    <div className="note-tags flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-[5px] border-2 border-ink bg-sand py-0.5 pl-2 pr-0.5 text-[0.8rem] font-bold"
        >
          #{tag.name}
          <button
            type="button"
            onClick={() => removeTag(tag.id)}
            aria-label={`Remover a tag ${tag.name}`}
            title="Remover tag"
            className="grid size-5 cursor-pointer place-items-center rounded-[3px] text-base leading-none hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            ×
          </button>
        </span>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void addTag(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => {
            const value = e.target.value;
            // Vírgula também confirma a tag.
            if (value.endsWith(",")) void addTag(value.slice(0, -1));
            else setDraft(value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !draft && tags.length > 0) {
              removeTag(tags[tags.length - 1].id);
            }
          }}
          list={listId}
          disabled={pending}
          placeholder={pending ? "Salvando…" : "+ tag"}
          aria-label="Adicionar tag"
          className="w-28 rounded-[5px] border-2 border-dashed border-ink/40 bg-transparent px-2 py-0.5 text-[0.8rem] font-bold placeholder:text-muted hover:border-ink focus:w-40 focus:border-solid focus:border-ink focus:bg-card focus:outline-none disabled:opacity-60"
        />
        <datalist id={listId}>
          {suggestions.map((tag) => (
            <option key={tag.id} value={tag.name} />
          ))}
        </datalist>
      </form>

      {error && (
        <span role="alert" className="text-[0.8rem] font-bold text-accent">
          {error}
        </span>
      )}
    </div>
  );
}
