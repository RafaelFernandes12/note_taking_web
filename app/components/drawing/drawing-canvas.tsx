"use client";

// Carregado só no navegador (via `next/dynamic` com `ssr: false`): o
// Excalidraw usa `window` e é pesado, então fica fora do bundle da nota.
import { Excalidraw } from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

export default function DrawingCanvas({
  initialData,
  onReady,
  onChange,
}: {
  initialData: ExcalidrawInitialDataState | null;
  onReady: (api: ExcalidrawImperativeAPI) => void;
  onChange: () => void;
}) {
  return (
    <Excalidraw
      initialData={initialData}
      excalidrawAPI={onReady}
      onChange={onChange}
      langCode="pt-BR"
      UIOptions={{
        canvasActions: {
          // Abrir/salvar arquivo e trocar tema não fazem sentido aqui:
          // o desenho é salvo dentro da nota.
          loadScene: false,
          saveToActiveFile: false,
          export: false,
          toggleTheme: false,
        },
      }}
    />
  );
}
