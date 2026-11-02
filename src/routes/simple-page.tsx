import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";

// Carregada sob demanda pelo router (`lazy`), que usa o export `Component`.
export function Component() {
  return <SimpleEditor />;
}
