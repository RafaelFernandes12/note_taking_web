import type { JSONContent } from "@tiptap/react";

export const UNTITLED = "Sem título";

/** Conteúdo de uma nota nova: um H1 vazio (o título) e um parágrafo. */
export const EMPTY_NOTE: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 } },
    { type: "paragraph" },
  ],
};

export function plainText(node: JSONContent | null | undefined): string {
  if (!node) return "";
  if (node.text) return node.text;
  return (node.content ?? [])
    .map(plainText)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** O título da nota é o texto da primeira linha (o H1 do topo). */
export function noteTitle(doc: JSONContent | null | undefined): string {
  return plainText(doc?.content?.[0]) || UNTITLED;
}

/** Texto da nota sem a primeira linha, para não repetir o título. */
export function noteBody(doc: JSONContent | null | undefined): string {
  return plainText({ type: "doc", content: doc?.content?.slice(1) ?? [] });
}

/** IDs das notas linkadas com `[[` (nós `noteLink`), sem repetir e sem a própria nota. */
export function linkedNoteIds(
  doc: JSONContent | null | undefined,
  selfId?: number,
): number[] {
  const ids = new Set<number>();
  const walk = (node: JSONContent) => {
    if (node.type === "noteLink") {
      const id = Number(node.attrs?.id);
      if (Number.isInteger(id) && id > 0 && id !== selfId) ids.add(id);
    }
    node.content?.forEach(walk);
  };
  if (doc) walk(doc);
  return [...ids];
}
