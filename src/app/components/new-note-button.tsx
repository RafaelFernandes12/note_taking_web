import { useState } from "react";
import { useNavigate } from "react-router";
import { createNote } from "@/app/lib/api";
import { openInPane } from "@/app/lib/note-tabs";

/** Cria uma nota vazia e abre ela numa aba nova. */
export function NewNoteButton() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const id = await createNote();
      const href = openInPane("main", id, true);
      if (href) navigate(href);
    } catch (error) {
      console.error("Falha ao criar a nota", error);
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title="Nova nota (Ctrl+N)"
      className="inline-flex cursor-pointer items-center gap-2 rounded-md border-2 border-ink bg-accent px-4 py-2 font-bold text-ink shadow-hard transition-[transform,box-shadow] duration-150 hover:-translate-x-px hover:-translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none-hard disabled:opacity-60"
    >
      <span aria-hidden className="text-xl leading-none">+</span>
      {pending ? "Criando…" : "Nova nota"}
    </button>
  );
}
