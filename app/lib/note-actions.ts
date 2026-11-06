"use server";

import { UNTITLED } from "@/app/lib/note-text";

export type NoteSummary = { id: number; title: string };

const PAGES_URL = "http://localhost:8080/api/pages";

/**
 * Busca notas pelo título, para o `[[` do editor sugerir links.
 * Roda no servidor porque o GET de `/api/pages` não libera CORS para o navegador.
 */
export async function searchNotes(
  query: string,
  excludeId?: number,
): Promise<NoteSummary[]> {
  const params = new URLSearchParams({ title: query.trim(), size: "8" });
  const res = await fetch(`${PAGES_URL}?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao buscar notas (${res.status})`);

  // O backend devolve um `PagedModel`: `{ content: [...], page: {...} }`.
  const data: { content?: { id: number; title: string | null }[] } =
    await res.json();

  return (data.content ?? [])
    .filter((page) => page.id !== excludeId)
    .map((page) => ({ id: page.id, title: page.title?.trim() || UNTITLED }));
}
