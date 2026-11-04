import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { JSONContent } from "@tiptap/react";
import { updateNote, type Tag } from "@/app/lib/api";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { useThrottledCallback } from "@/hooks/use-throttled-callback";
import { linkedNoteIds, noteTitle } from "@/app/lib/note-text";
import { NoteTags } from "@/app/components/note-tags";
import { createNoteLink } from "@/app/components/note-link-extension";
import { uploadNoteImage } from "@/app/lib/upload-image";
import { DrawingButton } from "@/app/components/drawing/drawing-button";
import type { UploadFunction } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import {
  currentPanes,
  flushPendingSaves,
  panesHref,
  registerPendingSave,
} from "@/app/lib/note-panes";

/** Tag como o backend devolve; reenviada inteira no PUT para não ser apagada. */
export type NoteTag = Tag;

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
  // Há mudança ainda não enviada (o save tem throttle de 1s).
  const dirtyRef = useRef(false);
  const navigate = useNavigate();

  const uploadImage: UploadFunction = (file, onProgress, signal) =>
    uploadNoteImage(file, id, onProgress, signal);

  // Usa só refs: continua funcionando depois que o componente desmonta.
  const persist = useMemo(
    () => async () => {
      dirtyRef.current = false;
      try {
        await updateNote(id, {
          title: noteTitle(contentRef.current),
          content: contentRef.current,
          tags: tagsRef.current,
          // Os links saem do próprio texto: cada `[[nota]]` vira um `{ id }`.
          links: linkedNoteIds(contentRef.current, id).map((linkId) => ({
            id: linkId,
          })),
        });
      } catch (error) {
        console.error("Falha ao salvar a página", error);
      }
    },
    [id],
  );

  const save = useThrottledCallback(persist, 1000, [persist]);

  // Antes de trocar de painel (ou ao fechar este), grava o que estiver pendente.
  useEffect(() => {
    const flush = async () => {
      if (!dirtyRef.current) return;
      save.cancel();
      await persist();
    };
    const unregister = registerPendingSave(flush);
    return () => {
      unregister();
      void flush();
    };
  }, [persist, save]);

  const extensions = useMemo(
    () => [
      createNoteLink({
        currentNoteId: id,
        onOpen: async (target, { newTab, otherPane }) => {
          if (newTab) {
            window.open(panesHref(target), "_blank", "noopener");
            return;
          }
          // Lê os painéis da URL na hora do clique: o do lado pode ter
          // aberto/fechado depois que o editor foi criado.
          const { mainId, sideId } = currentPanes();
          const pane = id === sideId ? "side" : "main";
          const otherId = pane === "main" ? sideId : mainId;
          // Já está aberta no outro painel: nada a fazer.
          if (target === otherId) return;

          // Clique normal troca a nota deste painel; Shift+clique abre no outro.
          let href: string;
          if (pane === "main") {
            href = otherPane ? panesHref(id, target) : panesHref(target, otherId);
          } else {
            href = otherPane
              ? panesHref(target, id)
              : panesHref(otherId ?? id, target);
          }
          await flushPendingSaves();
          navigate(href);
        },
      }),
    ],
    [id, navigate],
  );

  function markChanged() {
    dirtyRef.current = true;
    save();
  }

  return (
    <SimpleEditor
      initialContent={initialContent}
      extensions={extensions}
      uploadImage={uploadImage}
      toolbarExtra={<DrawingButton upload={uploadImage} />}
      onChange={(content) => {
        contentRef.current = content;
        markChanged();
      }}
      header={
        <NoteTags
          tags={tags}
          knownTags={knownTags}
          onChange={(next) => {
            setTags(next);
            tagsRef.current = next;
            // Mudança de tag é pontual: salva na hora, sem esperar o throttle.
            markChanged();
            save.flush();
          }}
        />
      }
    />
  );
}
