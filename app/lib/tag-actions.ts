"use server";

import type { NoteTag } from "@/app/components/note-editor";

const TAGS_URL = "http://localhost:8080/api/tags";

async function findTag(name: string): Promise<NoteTag | undefined> {
  const res = await fetch(TAGS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao carregar as tags (${res.status})`);
  const tags: NoteTag[] = await res.json();
  const key = name.toLocaleLowerCase("pt-BR");
  return tags.find((tag) => tag.name.toLocaleLowerCase("pt-BR") === key);
}

/**
 * Devolve a tag com esse nome, criando-a se ainda não existir.
 * Roda no servidor porque `/api/tags` não libera CORS para o navegador.
 */
export async function getOrCreateTag(name: string): Promise<NoteTag> {
  const existing = await findTag(name);
  if (existing) return existing;

  const res = await fetch(TAGS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (res.ok) return res.json();

  // O nome é único no banco: se outra requisição criou a tag antes, usa ela.
  const created = await findTag(name);
  if (created) return created;
  throw new Error(`Falha ao criar a tag (${res.status})`);
}
