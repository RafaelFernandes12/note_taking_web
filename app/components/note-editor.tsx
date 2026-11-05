"use client";

import { useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { useThrottledCallback } from "@/hooks/use-throttled-callback";
import { noteTitle } from "@/app/lib/note-text";
import { NoteTags } from "@/app/components/note-tags";

/** Tag como o backend devolve; reenviada inteira no PUT para não ser apagada. */
export type NoteTag = {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

export function NoteEditor({
  id,
  initialContent,
  initialTags,
  knownTags,
}: {
  id: number;
  initialContent: JSONContent;
  initialTags: NoteTag[];
  knownTags: NoteTag[];
}) {
  const [tags, setTags] = useState(initialTags);
  // O PUT sempre manda conteúdo e tags juntos (o backend sobrescreve os dois).
  const contentRef = useRef(initialContent);
  const tagsRef = useRef(initialTags);

  const save = useThrottledCallback(
    async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/pages/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: noteTitle(contentRef.current),
            content: contentRef.current,
            tags: tagsRef.current,
          }),
        });
        if (!res.ok) console.error("Falha ao salvar a página", res.status);
      } catch (error) {
        console.error("Falha ao salvar a página", error);
      }
    },
    1000,
    [id],
  );

  return (
    <SimpleEditor
      initialContent={initialContent}
      onChange={(content) => {
        contentRef.current = content;
        save();
      }}
      header={
        <NoteTags
          tags={tags}
          knownTags={knownTags}
          onChange={(next) => {
            setTags(next);
            tagsRef.current = next;
            // Mudança de tag é pontual: salva na hora, sem esperar o throttle.
            save();
            save.flush();
          }}
        />
      }
    />
  );
}
