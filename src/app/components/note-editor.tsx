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
  registerPendingSave,
} from "@/app/lib/note-panes";
import { openInPane, setTabTitle } from "@/app/lib/note-tabs";

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
          // Lê os painéis da URL na hora do clique: o do lado pode ter
          // aberto/fechado depois que o editor foi criado.
          const { sideId } = currentPanes();
          const pane = id === sideId ? "side" : "main";
          // Clique normal troca a nota desta aba; Ctrl/Cmd+clique abre numa
          // aba nova; Shift+clique abre numa aba nova do outro painel.
          const href = otherPane
            ? openInPane(pane === "main" ? "side" : "main", target, true)
            : openInPane(pane, target, newTab);
          if (!href) return;
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
        // O título da aba acompanha o H1 enquanto digita.
        setTabTitle(id, noteTitle(content));
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
