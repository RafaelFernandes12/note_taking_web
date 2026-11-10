"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { useThrottledCallback } from "@/hooks/use-throttled-callback";
import { linkedNoteIds, noteTitle } from "@/app/lib/note-text";
import { NoteTags } from "@/app/components/note-tags";
import { createNoteLink } from "@/app/components/note-link-extension";
import { uploadNoteImage } from "@/app/lib/upload-image";
import { DrawingButton } from "@/app/components/drawing/drawing-button";
import type { UploadFunction } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";

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
  // O PUT sempre manda conteúdo, tags e links juntos (o backend sobrescreve tudo).
  const contentRef = useRef(initialContent);
  const tagsRef = useRef(initialTags);
  const router = useRouter();

  const uploadImage: UploadFunction = (file, onProgress, signal) =>
    uploadNoteImage(file, id, onProgress, signal);

  const extensions = useMemo(
    () => [
      createNoteLink({
        currentNoteId: id,
        onOpen: (href, newTab) => {
          if (newTab) window.open(href, "_blank", "noopener");
          else router.push(href);
        },
      }),
    ],
    [id, router],
  );

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
            // Os links saem do próprio texto: cada `[[nota]]` vira um `{ id }`.
            links: linkedNoteIds(contentRef.current, id).map((linkId) => ({
              id: linkId,
            })),
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
      extensions={extensions}
      uploadImage={uploadImage}
      toolbarExtra={<DrawingButton upload={uploadImage} />}
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
