import Link from "next/link";
import type { JSONContent } from "@tiptap/react";
import { NewNoteButton } from "@/app/components/new-note-button";
import { noteBody, noteTitle, UNTITLED } from "@/app/lib/note-text";

type Tag = {
  id: number;
  name: string;
};

type PageSummary = {
  id: number;
  title: string | null;
  content: JSONContent | null;
  tags: Tag[] | null;
  createdAt: string;
  updatedAt: string;
};

type PagedModel<T> = {
  content: T[] | null;
  page?: { size: number; number: number; totalElements: number; totalPages: number };
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export async function NotesList() {
  // `title` é obrigatório no backend; vazio traz todas as notas.
  const params = new URLSearchParams({
    title: "",
    size: "100",
    sort: "updatedAt,desc",
  });
  const res = await fetch(`http://localhost:8080/api/pages?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Falha ao carregar as notas (${res.status})`);

  // O backend devolve um `PagedModel`: `{ content: [...], page: {...} }`.
  const data: PagedModel<PageSummary> = await res.json();
  const pages = data.content ?? [];
  const total = data.page?.totalElements ?? pages.length;

  if (pages.length === 0) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-[10px] border-2 border-dashed border-muted bg-card p-6">
        <span className="rounded-[5px] bg-sand px-2 py-0.5 text-[0.78rem] font-bold">
          Nenhuma nota ainda
        </span>
        <p className="max-w-md text-[0.95rem] text-muted">
          Crie uma nota para começar. Ela é salva sozinha enquanto você
          escreve.
        </p>
        <NewNoteButton />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-[0.8rem] font-black uppercase tracking-[0.08em]">
        Suas notas
        <span className="rounded-[5px] bg-sand px-1.5 py-0.5 text-[0.72rem]">
          {total}
        </span>
      </h2>

      <ul className="grid gap-4 sm:grid-cols-2">
        {pages.map((page) => {
          const snippet = noteBody(page.content);
          const title =
            page.title?.trim() && page.title !== UNTITLED
              ? page.title
              : noteTitle(page.content);
          return (
            <li key={page.id}>
              <Link
                href={`/page/${page.id}`}
                className="flex h-full flex-col gap-3 rounded-[10px] border-2 border-ink bg-card p-5 shadow-hard transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none-hard"
              >
                <h3 className="text-[1.35rem] font-black leading-tight tracking-tight [overflow-wrap:anywhere]">
                  {title}
                </h3>
                <p className="line-clamp-3 flex-1 text-[0.95rem] text-muted">
                  {snippet || "Nota vazia"}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {page.tags?.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-[5px] bg-sand px-2 py-0.5 text-[0.78rem] font-bold"
                    >
                      #{tag.name}
                    </span>
                  ))}
                  <time
                    dateTime={page.updatedAt}
                    className="ml-auto rounded-[5px] bg-peach px-2 py-0.5 text-[0.72rem] font-extrabold uppercase tracking-[0.06em]"
                  >
                    {dateFormat.format(new Date(page.updatedAt))}
                  </time>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
