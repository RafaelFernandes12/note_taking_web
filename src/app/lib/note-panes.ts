/**
 * Notas lado a lado: a URL guarda os dois painéis, `/page/{principal}?lado={id}`.
 * Abrir, fechar e trocar painéis é só navegar para outra URL.
 */

export const SIDE_PARAM = "lado";

export type Pane = "main" | "side";

export function panesHref(mainId: number, sideId?: number | null) {
  return sideId && sideId !== mainId
    ? `/page/${mainId}?${SIDE_PARAM}=${sideId}`
    : `/page/${mainId}`;
}

/** Lê o `?lado=` da URL; ignora valores inválidos e a própria nota principal. */
export function parseSideId(
  value: string | string[] | undefined,
  mainId: number,
): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 && id !== mainId ? id : null;
}

/** Painéis abertos agora, lidos da URL do navegador. */
export function currentPanes(): { mainId: number | null; sideId: number | null } {
  const match = window.location.pathname.match(/^\/page\/(\d+)/);
  const mainId = match ? Number(match[1]) : null;
  const side = new URLSearchParams(window.location.search).get(SIDE_PARAM);
  return {
    mainId,
    sideId: mainId ? parseSideId(side ?? undefined, mainId) : null,
  };
}

// --- Salvar antes de trocar de painel ---------------------------------------
// O editor salva com throttle. Antes de navegar, as notas abertas gravam o que
// estiver pendente; senão a próxima tela poderia carregar a versão antiga.

const pendingSaves = new Set<() => Promise<void>>();

export function registerPendingSave(save: () => Promise<void>) {
  pendingSaves.add(save);
  return () => {
    pendingSaves.delete(save);
  };
}

export async function flushPendingSaves() {
  await Promise.all([...pendingSaves].map((save) => save()));
}
