import { FileTypeSchema, UploadPresignSchema } from "@skill-coach/shared";
import { apiFetch } from "./client";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function isStoredArtifact(file: File) {
  return file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.(png|jpe?g|webp|pdf|docx)$/i.test(file.name);
}

function getContentType(file: File) {
  if ([
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ].includes(file.type)) {
    return file.type;
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    md: "text/plain",
  };
  return extension ? types[extension] : undefined;
}

export async function uploadArtifact(file: File) {
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    throw new Error("Ukuran file harus antara 1 byte dan 5 MB.");
  }

  const contentType = FileTypeSchema.parse(getContentType(file));
  const upload = await apiFetch("/uploads/presign", UploadPresignSchema, {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      contentType,
      size: file.size,
    }),
  });
  const response = await fetch(upload.uploadUrl, {
    method: upload.method,
    headers: upload.headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error("File gagal diunggah ke penyimpanan. Coba lagi.");
  }

  return {
    fileKey: upload.fileKey,
    fileType: contentType,
  };
}
