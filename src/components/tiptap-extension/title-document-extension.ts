import { Node } from "@tiptap/core"
import type { JSONContent } from "@tiptap/core"
import type { EditorState } from "@tiptap/pm/state"
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state"

/**
 * Documento cuja primeira linha é sempre um H1 (o título da nota).
 *
 * - O schema exige `heading` como primeiro bloco, então ele não pode ser
 *   apagado nem virar lista, citação etc. Apagar tudo deixa um H1 vazio.
 * - Um plugin mantém esse heading em nível 1 (o dropdown de heading
 *   não consegue rebaixá-lo para H2).
 * - Com a nota vazia, clicar em qualquer lugar leva o cursor ao título.
 *
 * Use com `StarterKit.configure({ document: false })` e normalize o conteúdo
 * inicial com `ensureTitleHeading`, porque documentos antigos podem não
 * começar com um heading.
 */
export const TitleDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "heading block*",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("titleDocument"),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null
          return fixTitle(newState)
        },
        props: {
          handleClick: (view) => {
            const { doc } = view.state
            if (!isDocEmpty(doc)) return false
            view.dispatch(
              view.state.tr.setSelection(TextSelection.create(doc, 1))
            )
            view.focus()
            return true
          },
        },
      }),
    ]
  },

  onCreate() {
    const tr = fixTitle(this.editor.state)
    if (tr) this.editor.view.dispatch(tr.setMeta("addToHistory", false))
  },
})

/** Título vazio e nenhum outro bloco com conteúdo. */
function isDocEmpty(doc: EditorState["doc"]) {
  let empty = true
  doc.forEach((child) => {
    if (!child.isTextblock || child.content.size > 0) empty = false
  })
  return empty
}

function fixTitle(state: EditorState) {
  const heading = state.schema.nodes.heading
  const first = state.doc.firstChild
  if (!heading) return null

  if (!first) return state.tr.insert(0, heading.create({ level: 1 }))
  if (first.type === heading) {
    if (first.attrs.level === 1) return null
    return state.tr.setNodeMarkup(0, undefined, { ...first.attrs, level: 1 })
  }
  if (first.isTextblock) {
    return state.tr.setNodeMarkup(0, heading, { level: 1 })
  }
  return state.tr.insert(0, heading.create({ level: 1 }))
}

/** Garante que o JSON começa com um H1, convertendo ou inserindo um. */
export function ensureTitleHeading(doc: JSONContent): JSONContent {
  const [first, ...rest] = doc.content ?? []
  const emptyTitle: JSONContent = { type: "heading", attrs: { level: 1 } }

  if (!first) return { ...doc, type: "doc", content: [emptyTitle] }
  if (first.type === "heading") {
    return {
      ...doc,
      content: [{ ...first, attrs: { ...first.attrs, level: 1 } }, ...rest],
    }
  }
  if (first.type === "paragraph") {
    return {
      ...doc,
      content: [
        { ...first, type: "heading", attrs: { ...first.attrs, level: 1 } },
        ...rest,
      ],
    }
  }
  return { ...doc, content: [emptyTitle, first, ...rest] }
}

/** O primeiro bloco (título) não tem texto. */
export function isTitleEmpty(doc: JSONContent): boolean {
  const first = doc.content?.[0]
  return !first?.content?.some((n) => n.text?.trim())
}
