import { mergeAttributes } from "@tiptap/core";
import { Mention } from "@tiptap/extension-mention";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import {
  NoteLinkList,
  type NoteLinkListHandle,
} from "@/app/components/note-link-list";
import { searchNotes, type NoteSummary } from "@/app/lib/api";

export const NOTE_LINK = "noteLink";

export const noteHref = (id: string | number) => `/page/${id}`;

type NoteLinkOptions = {
  /** Nota aberta no editor: não aparece nas sugestões. */
  currentNoteId?: number;
  /** Clique num link. `newTab` quando segurou Ctrl/Cmd. */
  onOpen?: (href: string, newTab: boolean) => void;
};

/**
 * Link para outra nota, no estilo wiki: digitar `[[` abre a busca de notas
 * e a escolhida vira um nó `noteLink` com `id` e `label` (o título).
 * Backspace logo depois do link desfaz ele de volta em `[[`.
 */
export function createNoteLink({ currentNoteId, onOpen }: NoteLinkOptions) {
  return Mention.extend({
    name: NOTE_LINK,

    parseHTML() {
      return [{ tag: `a[data-type="${NOTE_LINK}"]` }];
    },

    addProseMirrorPlugins() {
      return [
        ...(this.parent?.() ?? []),
        new Plugin({
          key: new PluginKey("noteLinkClick"),
          props: {
            handleDOMEvents: {
              click: (_view, event) => {
                const target = event.target as HTMLElement | null;
                const link = target?.closest<HTMLAnchorElement>(
                  `a[data-type="${NOTE_LINK}"]`,
                );
                if (!link) return false;
                // Dentro do contenteditable o navegador não segue o link sozinho.
                event.preventDefault();
                const href = link.getAttribute("href");
                if (href) onOpen?.(href, event.metaKey || event.ctrlKey);
                return true;
              },
            },
          },
        }),
      ];
    },
  }).configure({
    renderText: ({ node }) => `[[${node.attrs.label ?? node.attrs.id}]]`,
    renderHTML: ({ options, node }) => [
      "a",
      mergeAttributes(options.HTMLAttributes, {
        href: noteHref(node.attrs.id),
        class: "note-link",
      }),
      node.attrs.label ?? `Nota ${node.attrs.id}`,
    ],
    deleteTriggerWithBackspace: false,
    suggestion: {
      char: "[[",
      pluginKey: new PluginKey("noteLinkSuggestion"),
      // Títulos têm espaços e o `[[` pode vir colado em qualquer coisa.
      allowSpaces: true,
      allowedPrefixes: null,
      decorationClass: "note-link-suggestion",
      debounce: 150,
      items: ({ query }) =>
        // Ignora um `]]` digitado no fim por hábito.
        searchNotes(query.replace(/\]+$/, ""), currentNoteId).catch(
          (error) => {
            console.error("Falha ao buscar notas", error);
            return [];
          },
        ),
      command: ({ editor, range, props }) => {
        const note = props as unknown as NoteSummary;
        // Mesmo comportamento do Mention: troca o `[[busca` pelo nó + espaço.
        const nodeAfter = editor.state.selection.$to.nodeAfter;
        if (nodeAfter?.text?.startsWith(" ")) range.to += 1;
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: NOTE_LINK,
              attrs: {
                id: String(note.id),
                label: note.title,
                mentionSuggestionChar: "[[",
              },
            },
            { type: "text", text: " " },
          ])
          .run();
      },
      render: () => {
        let renderer: ReactRenderer<NoteLinkListHandle> | null = null;
        let unmount: (() => void) | null = null;

        return {
          onStart: (props) => {
            renderer = new ReactRenderer(NoteLinkList, {
              editor: props.editor,
              props,
              className: "note-link-popup",
            });
            unmount = props.mount(renderer.element);
          },
          onUpdate: (props) => renderer?.updateProps(props),
          onKeyDown: ({ event }) =>
            renderer?.ref?.onKeyDown(event) ?? false,
          onExit: () => {
            unmount?.();
            renderer?.destroy();
            unmount = null;
            renderer = null;
          },
        };
      },
    },
  });
}
