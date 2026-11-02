import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";

// O Excalidraw é pesado: só carrega quando o quadro abre.
const DrawingCanvas = lazy(() => import("@/app/components/drawing/drawing-canvas"));

/** Soma das versões dos elementos: muda a cada traço, igual ao `getSceneVersion`. */
function sceneVersion(api: ExcalidrawImperativeAPI) {
  return api
    .getSceneElementsIncludingDeleted()
    .reduce((sum, el) => sum + el.version, 0);
}

/**
 * Quadro do Excalidraw em tela cheia. Ao salvar, exporta um PNG com a cena
 * embutida (`exportEmbedScene`), que é o que permite reabrir e editar depois.
 */
export function DrawingDialog({
  initialData,
  editing,
  onSave,
  onClose,
}: {
  initialData: ExcalidrawInitialDataState | null;
  /** Reabrindo um desenho que já está na nota. */
  editing: boolean;
  onSave: (png: Blob) => Promise<void>;
  onClose: () => void;
}) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const startVersion = useRef<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trava a rolagem da nota atrás do quadro.
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  function close() {
    if (saving) return;
    if (dirty && !window.confirm("Descartar as mudanças do desenho?")) return;
    onClose();
  }

  async function save() {
    const api = apiRef.current;
    if (!api || saving) return;
    const elements = api.getSceneElements();
    if (elements.length === 0) {
      setError("O desenho está vazio.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const png = await exportToBlob({
        elements,
        files: api.getFiles(),
        mimeType: "image/png",
        exportPadding: 16,
        appState: {
          ...api.getAppState(),
          exportBackground: true,
          exportEmbedScene: true,
          exportScale: 2,
        },
      });
      await onSave(png);
    } catch (e) {
      console.error("Falha ao salvar o desenho", e);
      setError(e instanceof Error ? e.message : "Falha ao salvar o desenho.");
      setSaving(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Editar desenho" : "Novo desenho"}
      className="fixed inset-0 z-[100] flex flex-col bg-paper"
    >
      <header className="flex items-center gap-3 border-b-2 border-ink px-4 py-2">
        <span className="rounded-[5px] bg-peach px-2 py-0.5 text-[0.72rem] font-extrabold uppercase tracking-[0.06em]">
          {editing ? "Editando desenho" : "Novo desenho"}
        </span>
        {error && (
          <span role="alert" className="text-[0.8rem] font-bold text-accent">
            {error}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="cursor-pointer rounded-md border-2 border-ink bg-card px-3 py-1.5 text-[0.9rem] font-bold hover:bg-sand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="cursor-pointer rounded-md border-2 border-ink bg-accent px-3 py-1.5 text-[0.9rem] font-bold shadow-hard transition-[transform,box-shadow] duration-150 hover:-translate-x-px hover:-translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none-hard disabled:opacity-60"
          >
            {saving ? "Salvando…" : editing ? "Salvar desenho" : "Inserir na nota"}
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <Suspense
          fallback={
            <p className="grid h-full place-items-center text-xs font-black uppercase tracking-[0.08em] text-muted">
              Abrindo o quadro…
            </p>
          }
        >
        <DrawingCanvas
          initialData={initialData}
          onReady={(api) => {
            apiRef.current = api;
          }}
          onChange={() => {
            const api = apiRef.current;
            if (!api) return;
            const version = sceneVersion(api);
            // A primeira chamada é a cena carregada, não uma mudança.
            if (startVersion.current === null) startVersion.current = version;
            else if (version !== startVersion.current && !dirty) setDirty(true);
          }}
        />
        </Suspense>
      </div>
    </div>,
    document.body,
  );
}
