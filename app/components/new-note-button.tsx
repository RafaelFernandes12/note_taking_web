import { redirect } from "next/navigation";
import { EMPTY_NOTE, UNTITLED } from "@/app/lib/note-text";

async function createNote() {
  "use server";

  const res = await fetch("http://localhost:8080/api/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: UNTITLED,
      content: EMPTY_NOTE,
    }),
  });
  if (!res.ok) throw new Error(`Falha ao criar a nota (${res.status})`);

  const page: { id: number } = await res.json();
  redirect(`/page/${page.id}`);
}

export function NewNoteButton() {
  return (
    <form action={createNote}>
      <button
        type="submit"
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border-2 border-ink bg-accent px-4 py-2 font-bold text-ink shadow-hard transition-[transform,box-shadow] duration-150 hover:-translate-x-px hover:-translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none-hard"
      >
        <span aria-hidden className="text-xl leading-none">+</span>
        Nova nota
      </button>
    </form>
  );
}
