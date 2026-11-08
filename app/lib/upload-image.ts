import { MAX_FILE_SIZE } from "@/lib/tiptap-utils";

/**
 * `/api/files` é repassado para o backend pelo `rewrites` do next.config.
 * Assim o upload sai da mesma origem (o backend não libera CORS) e a imagem
 * fica salva na nota com um caminho relativo, sem o host do backend.
 */
const FILES_PATH = "/api/files";

export const fileUrl = (id: number | string) => `${FILES_PATH}/${id}`;

/**
 * O backend usa o nome do arquivo como chave no S3 e como coluna única,
 * então dois `image.png` colados se sobrescreveriam. Gera um nome único
 * mantendo a extensão.
 */
function uniqueName(file: File) {
  const ext = file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? "";
  return `${crypto.randomUUID()}${ext.toLowerCase()}`;
}

/**
 * Envia a imagem para `POST /api/files` (multipart com `file` e `page_id`)
 * e devolve a URL que a busca de volta (`GET /api/files/{id}`).
 * Usa XHR em vez de fetch para ter o progresso do envio.
 */
export function uploadNoteImage(
  file: File,
  pageId: number,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(
      new Error(`A imagem passa de ${MAX_FILE_SIZE / (1024 * 1024)}MB`),
    );
  }

  const body = new FormData();
  body.append("file", file, uniqueName(file));
  body.append("page_id", String(pageId));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", FILES_PATH);
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      // Segura em 99% até o backend responder com o id.
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress?.({ progress: Math.min(progress, 99) });
    };

    xhr.onload = () => {
      const data = xhr.response as { id?: number; detail?: string } | null;
      if (xhr.status >= 200 && xhr.status < 300 && data?.id != null) {
        onProgress?.({ progress: 100 });
        resolve(fileUrl(data.id));
      } else {
        reject(
          new Error(data?.detail ?? `Falha ao enviar a imagem (${xhr.status})`),
        );
      }
    };
    xhr.onerror = () => reject(new Error("Falha de rede ao enviar a imagem"));
    xhr.onabort = () => reject(new Error("Upload cancelado"));

    if (abortSignal?.aborted) return reject(new Error("Upload cancelado"));
    abortSignal?.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(body);
  });
}
