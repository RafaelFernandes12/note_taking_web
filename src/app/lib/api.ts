import type { JSONContent } from "@tiptap/react";
import { EMPTY_NOTE, UNTITLED } from "@/app/lib/note-text";

/**
 * Todas as chamadas ao backend (Spring) num lugar só.
 *
 * Os caminhos são relativos (`/api/...`): em desenvolvimento o Vite repassa
 * para o Spring em localhost:8080 (ver `vite.config.ts`); no app desktop o
 * próprio Spring serve o front, então fica tudo na mesma origem, sem CORS.
 */

export type Tag = {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Note = {
  id: number;
  title: string | null;
  content: JSONContent;
  tags: Tag[] | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteSummary = { id: number; title: string };

/** `PagedModel` do Spring: `{ content: [...], page: {...} }`. */
type Paged<T> = {
  content: T[] | null;
  page?: { size: number; number: number; totalElements: number; totalPages: number };
};

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) throw new ApiError(`${init?.method ?? "GET"} ${path} → ${res.status}`, res.status);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// --- Notas (/api/pages) --------------------------------------------------------

/** Lista as notas, mais recentes primeiro. `title` vazio traz todas. */
export async function listNotes(title = "", size = 100, signal?: AbortSignal) {
  const params = new URLSearchParams({ title, size: String(size), sort: "updatedAt,desc" });
  const data = await request<Paged<Note>>(`/api/pages?${params}`, { signal });
  const notes = data.content ?? [];
  return { notes, total: data.page?.totalElements ?? notes.length };
}

/** Uma nota, ou `null` se não existe. */
export async function getNote(id: number, signal?: AbortSignal): Promise<Note | null> {
  try {
    return await request<Note>(`/api/pages/${id}`, { signal });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Cria uma nota vazia (só o H1 do título) e devolve o id. */
export async function createNote(): Promise<number> {
  const note = await request<Note>(
    "/api/pages",
    json("POST", { title: UNTITLED, content: EMPTY_NOTE }),
  );
  return note.id;
}

/** Salva a nota inteira: o backend sobrescreve conteúdo, tags e links. */
export async function updateNote(
  id: number,
  note: {
    title: string;
    content: JSONContent;
    tags: Tag[];
    links: { id: number }[];
  },
) {
  await request<Note>(`/api/pages/${id}`, json("PUT", note));
}

/** Busca notas pelo título (para o `[[` e o Ctrl+]). */
export async function searchNotes(
  query: string,
  excludeId?: number,
): Promise<NoteSummary[]> {
  const { notes } = await listNotes(query.trim(), 8);
  return notes
    .filter((note) => note.id !== excludeId)
    .map((note) => ({ id: note.id, title: note.title?.trim() || UNTITLED }));
}

// --- Tags (/api/tags) -------------------------------------------------------------

export function listTags(signal?: AbortSignal) {
  return request<Tag[]>("/api/tags", { signal });
}

async function findTag(name: string) {
  const key = name.toLocaleLowerCase("pt-BR");
  const tags = await listTags();
  return tags.find((tag) => tag.name.toLocaleLowerCase("pt-BR") === key);
}

/** Devolve a tag com esse nome, criando-a se ainda não existir. */
export async function getOrCreateTag(name: string): Promise<Tag> {
  const existing = await findTag(name);
  if (existing) return existing;
  try {
    return await request<Tag>("/api/tags", json("POST", { name }));
  } catch (error) {
    // O nome é único no banco: se outra requisição criou a tag antes, usa ela.
    const created = await findTag(name);
    if (created) return created;
    throw error;
  }
}
