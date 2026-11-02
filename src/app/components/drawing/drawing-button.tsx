import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { Button } from "@/components/tiptap-ui-primitive/button";
import type { UploadFunction } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { DrawingDialog } from "@/app/components/drawing/drawing-dialog";

type Session = {
  initialData: ExcalidrawInitialDataState | null;
  /** `src` do desenho sendo editado; `null` quando é um desenho novo. */
  editingSrc: string | null;
};

/** Acha o nó de imagem (desenho) com esse `src` na nota. */
function findDrawing(editor: Editor, src: string) {
  let found: { pos: number; attrs: Record<string, unknown> } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === "image" && node.attrs.src === src) {
      found = { pos, attrs: node.attrs };
      return false;
    }
  });
  return found as { pos: number; attrs: Record<string, unknown> } | null;
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M13 21h8" />
      <path d="M21.17 6.81a2.82 2.82 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
    </svg>
  );
}

/**
 * Botão "Desenhar" da barra: abre o Excalidraw e insere o desenho como
 * imagem (`drawing: true`). Duplo clique num desenho da nota reabre ele
 * para edição — a cena vem embutida no próprio PNG.
 */
export function DrawingButton({ upload }: { upload: UploadFunction }) {
  const { editor } = useTiptapEditor();
  const [session, setSession] = useState<Session | null>(null);
  const [opening, setOpening] = useState(false);

  const openExisting = useCallback(async (src: string) => {
    setOpening(true);
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const { loadFromBlob } = await import("@excalidraw/excalidraw");
      const scene = await loadFromBlob(blob, null, null);
      setSession({
        editingSrc: src,
        initialData: {
          elements: scene.elements,
          files: scene.files,
          appState: {
            viewBackgroundColor: scene.appState.viewBackgroundColor,
          },
          scrollToContent: true,
        },
      });
    } catch (error) {
      console.error("Falha ao abrir o desenho", error);
      window.alert("Não foi possível abrir esse desenho para edição.");
    } finally {
      setOpening(false);
    }
  }, []);

  // Duplo clique num desenho abre o editor com a cena dele.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onDoubleClick = (event: MouseEvent) => {
      const img = (event.target as HTMLElement | null)?.closest?.(
        "img[data-drawing]",
      );
      const src = img?.getAttribute("src");
      if (!src) return;
      event.preventDefault();
      void openExisting(src);
    };
    dom.addEventListener("dblclick", onDoubleClick);
    return () => dom.removeEventListener("dblclick", onDoubleClick);
  }, [editor, openExisting]);

  async function save(png: Blob) {
    if (!editor || !session) return;
    const file = new File([png], "desenho.png", { type: "image/png" });
    const src = await upload(file);

    const existing = session.editingSrc
      ? findDrawing(editor, session.editingSrc)
      : null;

    if (existing) {
      // Troca só o arquivo; posição, alinhamento etc. ficam.
      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          tr.setNodeMarkup(existing.pos, undefined, { ...existing.attrs, src });
          return true;
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: { src, alt: "Desenho", title: "Desenho", drawing: true },
        })
        .run();
    }
    setSession(null);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        tabIndex={-1}
        disabled={!editor || opening}
        aria-label="Desenhar"
        tooltip="Desenhar (duplo clique num desenho para editar)"
        onClick={() => setSession({ initialData: null, editingSrc: null })}
      >
        <PencilIcon className="tiptap-button-icon" />
        <span className="tiptap-button-text">
          {opening ? "Abrindo…" : "Desenhar"}
        </span>
      </Button>

      {session && (
        <DrawingDialog
          initialData={session.initialData}
          editing={session.editingSrc !== null}
          onSave={save}
          onClose={() => setSession(null)}
        />
      )}
    </>
  );
}
