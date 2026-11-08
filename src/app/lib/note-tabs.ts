import { useSyncExternalStore } from "react";
import { currentPanes, panesHref, type Pane } from "@/app/lib/note-panes";

/**
 * Abas no estilo do Obsidian: uma faixa só, com as notas abertas. Cada painel
 * (principal e, se houver, o do lado) mostra uma dessas abas.
 *
 * A URL diz qual nota cada painel mostra (`/page/{principal}?lado={id}`);
 * aqui ficam a lista de abas e os títulos, salvos no localStorage para
 * sobreviver a um reload.
 */

export type TabsState = {
  ids: number[];
  titles: Record<number, string>;
  /** Painel que recebeu foco por último: clicar numa aba abre nele. */
  focused: Pane;
};

const STORAGE_KEY = "notas.abas.v2";
const EMPTY: TabsState = { ids: [], titles: {}, focused: "main" };

function load(): TabsState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<TabsState>;
    return {
      ids: Array.isArray(parsed.ids)
        ? [...new Set(parsed.ids.filter(Number.isInteger))]
        : [],
      titles:
        parsed.titles && typeof parsed.titles === "object" ? parsed.titles : {},
      focused: "main",
    };
  } catch {
    return EMPTY;
  }
}

let state: TabsState = load();
const listeners = new Set<() => void>();

function setState(next: TabsState) {
  if (next === state) return;
  state = next;
  try {
    // Só guarda títulos das abas abertas, para o storage não crescer à toa.
    const open = new Set(next.ids);
    const titles = Object.fromEntries(
      Object.entries(next.titles).filter(([id]) => open.has(Number(id))),
    );
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ids: next.ids, titles }),
    );
  } catch {
    // localStorage indisponível (aba anônima etc.): segue só em memória.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNoteTabs(): TabsState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

// --- Sincronizar com o que está na tela ---------------------------------------

/** Nota que cada painel mostrava na última sincronização. */
const shown: Record<Pane, number | null> = { main: null, side: null };

/**
 * Chamado quando um painel passa a mostrar `noteId` (ou some, com `null`).
 * Se a nota não está nas abas, ela entra no lugar da aba que o painel
 * mostrava — igual a seguir um link no Obsidian —, ou no fim da faixa.
 */
export function syncPane(pane: Pane, noteId: number | null) {
  const previous = shown[pane];
  shown[pane] = noteId;
  if (noteId === null || state.ids.includes(noteId)) return;

  const ids = [...state.ids];
  const other = shown[pane === "main" ? "side" : "main"];
  const at = previous === null || previous === other ? -1 : ids.indexOf(previous);
  if (at >= 0) ids[at] = noteId;
  else ids.push(noteId);
  setState({ ...state, ids });
}

export function setTabTitle(id: number, title: string) {
  if (state.titles[id] === title) return;
  setState({ ...state, titles: { ...state.titles, [id]: title } });
}

export function setFocusedPane(pane: Pane) {
  if (state.focused === pane) return;
  setState({ ...state, focused: pane });
}

// --- Ações (devolvem a URL para onde navegar, ou null se nada muda) -----------

/** URL com `id` no painel `pane`, mantendo o outro como está. */
function hrefWith(pane: Pane, id: number) {
  const { mainId, sideId } = currentPanes();
  if (pane === "main" || !mainId) return panesHref(id, pane === "main" ? sideId : null);
  return panesHref(mainId, id);
}

/**
 * Mostra a nota `id` no painel. `newTab`: cria a aba logo depois da que o
 * painel mostra; senão a nota toma o lugar dessa aba. Se a nota já tem aba,
 * só passa a ser mostrada.
 */
export function openInPane(pane: Pane, id: number, newTab: boolean) {
  const { mainId, sideId } = currentPanes();
  const current = pane === "main" ? mainId : sideId;
  const other = pane === "main" ? sideId : mainId;
  // A mesma nota nos dois painéis vira dois editores brigando.
  if (id === other || id === current) return null;

  if (!state.ids.includes(id)) {
    const ids = [...state.ids];
    const at = current === null ? -1 : ids.indexOf(current);
    if (at < 0) ids.push(id);
    else if (newTab) ids.splice(at + 1, 0, id);
    else ids[at] = id;
    setState({ ...state, ids });
  }
  return hrefWith(pane, id);
}

/** Clique numa aba: se já está num painel, fica; senão abre no painel com foco. */
export function showTab(id: number) {
  const { mainId, sideId } = currentPanes();
  if (id === mainId || id === sideId) return null;
  return hrefWith(sideId ? state.focused : "main", id);
}

/**
 * Fecha a aba. Se ela estava num painel, o painel mostra a aba vizinha
 * (direita, senão esquerda); sem vizinha livre, o painel fecha.
 */
export function closeTab(id: number) {
  const at = state.ids.indexOf(id);
  if (at < 0) return null;
  const ids = state.ids.filter((tabId) => tabId !== id);
  setState({ ...state, ids });

  const { mainId, sideId } = currentPanes();
  if (id !== mainId && id !== sideId) return null;

  const pane: Pane = id === mainId ? "main" : "side";
  const other = pane === "main" ? sideId : mainId;
  const neighbours = [...ids.slice(at), ...ids.slice(0, at).reverse()];
  const next = neighbours.find((tabId) => tabId !== other);
  return next === undefined ? closePane(pane) : hrefWith(pane, next);
}

/** Fecha o painel (as abas ficam). Fechando o principal, o do lado assume. */
export function closePane(pane: Pane) {
  const { mainId, sideId } = currentPanes();
  if (pane === "side") return mainId ? panesHref(mainId) : "/";
  return sideId ? panesHref(sideId) : "/";
}

/** Troca as notas dos dois painéis de lado. */
export function swapPanes() {
  const { mainId, sideId } = currentPanes();
  if (!mainId || !sideId) return null;
  return panesHref(sideId, mainId);
}
