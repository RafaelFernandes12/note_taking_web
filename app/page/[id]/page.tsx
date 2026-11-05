import { Suspense } from "react";
import type { JSONContent } from "@tiptap/react";
import { AppHeader } from "@/app/components/app-header";
import { NewNoteButton } from "@/app/components/new-note-button";
import { NoteEditor, type NoteTag } from "@/app/components/note-editor";
import { notFound } from "next/navigation";

type PageData = {
  id: number;
  title: string | null;
  content: JSONContent;
  tags: NoteTag[] | null;
  createdAt: string;
  updatedAt: string;
};

export default function NotePage(props: PageProps<"/page/[id]">) {
  return (
    <>
      <AppHeader>
        <NewNoteButton />
      </AppHeader>
      <main className="flex flex-1 flex-col">
        <Suspense
          fallback={
            <p className="mx-auto mt-10 text-xs font-black uppercase tracking-[0.08em] text-muted">
              Carregando…
            </p>
          }
        >
          <NoteContent params={props.params} />
        </Suspense>
      </main>
    </>
  );
}

async function NoteContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [res, tagsRes] = await Promise.all([
    fetch(`http://localhost:8080/api/pages/${id}`, { cache: "no-store" }),
    fetch("http://localhost:8080/api/tags", { cache: "no-store" }),
  ]);
  if (!res.ok) notFound();

  console.log("RES", res);
  const page: PageData = await res.json();
  // Sem a lista de tags a nota ainda abre; só perde as sugestões.
  const knownTags: NoteTag[] = tagsRes.ok ? await tagsRes.json() : [];

  return (
    <NoteEditor
      id={page.id}
      initialContent={page.content}
      initialTags={page.tags ?? []}
      knownTags={knownTags}
    />
  );
}
