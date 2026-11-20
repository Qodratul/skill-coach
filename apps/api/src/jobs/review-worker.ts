import OpenAI from "openai";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { prisma, logger, boss, REVIEW_QUEUE } from "../app.js";
import { env } from "../config.js";
import { reviewOutputSchemaFor } from "../ai/review-schemas.js";
import {
  buildReviewPrompt,
  REVIEW_SYSTEM_PROMPT,
} from "../ai/prompts/review-prompt-v4.js";
import { codeReviewGuidance } from "../ai/prompts/code-review.js";
import { essayReviewGuidance } from "../ai/prompts/essay-review.js";
import { uiReviewGuidance } from "../ai/prompts/ui-review.js";
const aiText = new OpenAI({
  apiKey: env.NEBIUS_API_KEY,
  baseURL: env.NEBIUS_MODEL_TEXT_BASE_URL,
  timeout: 45000,
  maxRetries: 2,
});
const aiVision = new OpenAI({
  apiKey: env.NEBIUS_API_KEY,
  baseURL: env.NEBIUS_MODEL_VISION_BASE_URL,
  timeout: 45000,
  maxRetries: 2,
});
const storage = new S3Client({
  region: "auto",
  endpoint: env.STORAGE_ENDPOINT || undefined,
  credentials:
    env.STORAGE_ACCESS_KEY && env.STORAGE_SECRET_KEY
      ? {
          accessKeyId: env.STORAGE_ACCESS_KEY,
          secretAccessKey: env.STORAGE_SECRET_KEY,
        }
      : undefined,
});
const schemaRetryGuidance =
  "\n\nPercobaan sebelumnya tidak sesuai skema. Keluarkan ulang satu objek JSON yang memenuhi seluruh aturan, memakai tepat empat kriteria dan semua batas panjang yang diminta.";
const parseQuotaPeriod = (period: string) => new Date(`${period}T00:00:00`);
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function validateFileSignature(fileType: string | null, bytes: Buffer) {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);
  const matches =
    (fileType === "image/png" &&
      startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) ||
    (fileType === "image/jpeg" && startsWith(0xff, 0xd8, 0xff)) ||
    (fileType === "image/webp" &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP") ||
    (fileType === "application/pdf" && bytes.toString("ascii", 0, 5) === "%PDF-") ||
    (fileType === DOCX_MIME && startsWith(0x50, 0x4b, 0x03, 0x04));

  if (fileType === "text/plain") {
    if (bytes.includes(0)) throw Error("File teks tidak valid.");
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw Error("File teks harus menggunakan UTF-8.");
    }
    return;
  }
  if (!matches) throw Error("Isi file tidak sesuai dengan tipe file yang dipilih.");
}

function validateDocxArchive(bytes: Buffer) {
  const minOffset = Math.max(0, bytes.length - 22 - 0xffff);
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= minOffset; offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw Error("Dokumen DOCX tidak valid.");

  const entries = bytes.readUInt16LE(endOffset + 10);
  const centralSize = bytes.readUInt32LE(endOffset + 12);
  let offset = bytes.readUInt32LE(endOffset + 16);
  if (
    entries === 0xffff ||
    centralSize === 0xffffffff ||
    offset === 0xffffffff ||
    entries > 10000 ||
    offset + centralSize > endOffset
  )
    throw Error("Struktur DOCX tidak didukung atau terlalu besar.");

  let expandedBytes = 0;
  let hasMainDocument = false;
  for (let index = 0; index < entries; index++) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50)
      throw Error("Dokumen DOCX tidak valid.");
    const flags = bytes.readUInt16LE(offset + 8);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const uncompressedSize = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const entryEnd = offset + 46 + nameLength + extraLength + commentLength;
    if (
      entryEnd > bytes.length ||
      (flags & 1) !== 0 ||
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      (compressedSize === 0 && uncompressedSize > 0)
    )
      throw Error("Struktur DOCX tidak didukung atau tidak valid.");

    const fileName = bytes.toString("utf8", offset + 46, offset + 46 + nameLength);
    if (fileName === "word/document.xml") hasMainDocument = true;
    expandedBytes += uncompressedSize;
    if (
      expandedBytes > 25 * 1024 * 1024 ||
      (uncompressedSize > 1024 * 1024 &&
        uncompressedSize / Math.max(compressedSize, 1) > 200)
    )
      throw Error("Dokumen DOCX terlalu besar untuk diproses dengan aman.");
    offset = entryEnd;
  }
  if (!hasMainDocument) throw Error("File ZIP ini bukan dokumen DOCX.");
}

await boss.start();
await boss.createQueue(REVIEW_QUEUE);
await boss.work<{
  versionId: string;
  requestId?: string;
  quotaPeriodStart?: string;
  quotaReserved?: boolean;
}>(REVIEW_QUEUE, async (jobs) => {
  for (const job of jobs) {
    const version = await prisma.version.findUnique({
      where: { id: job.data.versionId },
      include: {
        project: {
          include: {
            user: true,
            versions: {
              where: { status: "DONE" },
              orderBy: { versionNumber: "desc" },
              take: 1,
              include: { review: true },
            },
          },
        },
      },
    });
    if (!version) continue;
    try {
      const claimed = await prisma.version.updateMany({
        where: { id: version.id, status: "QUEUED" },
        data: { status: "PROCESSING", errorMessage: null },
      });
      if (!claimed.count) continue;
      if (!env.NEBIUS_API_KEY) throw Error("Penyedia AI belum dikonfigurasi.");
      const prior = version.project.versions[0]?.review;
      let submission =
        (version.fileType === "application/pdf" || version.fileType === DOCX_MIME) &&
        version.fileKey
          ? ""
          : version.textContent || "";
      let imageDataUrls: string[] = [];
      let previewText: string | undefined;
      if (version.fileKey) {
        if (
          !env.STORAGE_ENDPOINT ||
          !env.STORAGE_ACCESS_KEY ||
          !env.STORAGE_SECRET_KEY ||
          !version.fileKey.startsWith(`${version.project.userId}/`)
        )
          throw Error("File tidak tersedia.");
        const metadata = await storage.send(
          new HeadObjectCommand({
            Bucket: env.STORAGE_BUCKET,
            Key: version.fileKey,
          }),
        );
        if ((metadata.ContentLength ?? 0) > 5 * 1024 * 1024)
          throw Error("Ukuran file melebihi batas.");
        if (metadata.ContentType !== version.fileType)
          throw Error("Tipe file tidak sesuai dengan metadata upload.");
        const object = await storage.send(
          new GetObjectCommand({
            Bucket: env.STORAGE_BUCKET,
            Key: version.fileKey,
          }),
        );
        if (!object.Body) throw Error("File kosong.");
        const bytes = Buffer.from(await object.Body.transformToByteArray());
        if (bytes.byteLength > 5 * 1024 * 1024)
          throw Error("Ukuran file melebihi batas.");
        validateFileSignature(version.fileType, bytes);
        if (version.fileType?.startsWith("image/"))
          imageDataUrls = [`data:${version.fileType};base64,${bytes.toString("base64")}`];
        else if (version.fileType === "text/plain")
          submission += `\n${bytes.toString("utf8")}`;
        else if (version.fileType === "application/pdf") {
          const parser = new PDFParse({ data: bytes });
          try {
            const extracted = await parser.getText({ first: 1, last: 30 });
            submission += `\n${extracted.text}`;
            if (extracted.text.trim()) previewText = extracted.text.slice(0, 8000);
            if (extracted.text.trim().length < 80) {
              const screenshots = await parser.getScreenshot({
                first: 3,
                desiredWidth: 1200,
                imageBuffer: false,
              });
              imageDataUrls = screenshots.pages.map((page) => page.dataUrl);
              if (imageDataUrls.length) {
                submission +=
                  "\nPDF hasil scan: telaah teks dan elemen yang terbaca pada gambar maksimal tiga halaman awal saja.";
              }
              if (!imageDataUrls.length && !extracted.text.trim())
                throw Error("PDF tidak berisi teks yang dapat dibaca.");
            }
          } finally {
            await parser.destroy();
          }
        } else if (version.fileType === DOCX_MIME) {
          validateDocxArchive(bytes);
          const extracted = await mammoth.extractRawText({ buffer: bytes });
          if (!extracted.value.trim())
            throw Error("DOCX tidak berisi teks yang dapat dibaca.");
          submission += `\n${extracted.value.slice(0, 30000)}`;
          previewText = extracted.value.slice(0, 8000);
        } else throw Error("Tipe file tidak didukung untuk review.");
      }
      if (previewText) {
        await prisma.version.update({
          where: { id: version.id },
          data: { textContent: previewText },
        });
      }
      const guidance =
        version.project.skillType === "UI"
          ? uiReviewGuidance
          : version.project.skillType === "CODE"
            ? codeReviewGuidance
            : essayReviewGuidance;
      const prompt = buildReviewPrompt({
        skillType: version.project.skillType,
        level: version.project.user.level,
        critiqueTone: version.project.user.critiqueTone,
        goal: version.project.goal ?? version.project.description,
        guidance,
        submission,
        previousReview: prior ? { scores: prior.scores, summary: prior.summary } : null,
      });
      let output: any;
      let tokensIn = 0,
        tokensOut = 0;
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await (
          imageDataUrls.length ? aiVision : aiText
        ).chat.completions.create({
          model: imageDataUrls.length
            ? env.NEBIUS_MODEL_VISION
            : env.NEBIUS_MODEL_TEXT,
          temperature: 0.2,
          ...(imageDataUrls.length
            ? {}
            : { response_format: { type: "json_object" as const } }),
          messages: [
            { role: "system", content: REVIEW_SYSTEM_PROMPT },
            {
              role: "user",
              content: imageDataUrls.length
                ? [
                    {
                      type: "text",
                      text: prompt + (attempt ? schemaRetryGuidance : ""),
                    },
                    ...imageDataUrls.map((url) => ({
                      type: "image_url" as const,
                      image_url: { url },
                    })),
                  ]
                : prompt + (attempt ? schemaRetryGuidance : ""),
            },
          ],
        });
        tokensIn = result.usage?.prompt_tokens ?? tokensIn;
        tokensOut = result.usage?.completion_tokens ?? tokensOut;
        try {
          output = reviewOutputSchemaFor(version.project.skillType).parse(
            JSON.parse(result.choices[0]?.message.content || ""),
          );
          break;
        } catch (e) {
          if (attempt === 1) throw e;
        }
      }
      const previousScores = prior?.scores;
      if (previousScores && typeof previousScores === "object" && !Array.isArray(previousScores)) {
        const deltas = Object.fromEntries(
          Object.entries(output.scores as Record<string, number>)
            .filter(
              ([criterion]) =>
                typeof (previousScores as Record<string, unknown>)[criterion] ===
                "number",
            )
            .map(([criterion, score]) => [
              criterion,
              score - Number((previousScores as Record<string, unknown>)[criterion]),
            ]),
        );
        output.comparison = Object.keys(deltas).length
          ? {
              score_delta: deltas,
              progress_commentary: "Perubahan dihitung dari skor kriteria yang sama pada versi sebelumnya.",
            }
          : null;
      } else {
        output.comparison = null;
      }
      const now = new Date(),
        periodStart = job.data.quotaPeriodStart
          ? parseQuotaPeriod(job.data.quotaPeriodStart)
          : new Date(now.getFullYear(), now.getMonth(), 1),
        quotaWhere = {
          userId_periodStart: { userId: version.project.userId, periodStart },
        };
      const cost =
        (tokensIn * env.NEBIUS_INPUT_COST_PER_MILLION +
          tokensOut * env.NEBIUS_OUTPUT_COST_PER_MILLION) /
        1_000_000;
      await prisma.$transaction(async (tx) => {
        if (!job.data.quotaReserved) {
          await tx.usageQuota.upsert({
            where: quotaWhere,
            create: {
              userId: version.project.userId,
              periodStart,
              limitCount: env.MONTHLY_REVIEW_LIMIT,
            },
            update: {},
          });
          const claimed = await tx.usageQuota.updateMany({
            where: {
              userId: version.project.userId,
              periodStart,
              usedCount: { lt: env.MONTHLY_REVIEW_LIMIT },
            },
            data: { usedCount: { increment: 1 } },
          });
          if (!claimed.count) throw Error("Kuota habis saat pemrosesan.");
        }
        await tx.review.create({
          data: {
            versionId: version.id,
            summary: output.summary,
            scores: output.scores,
            strengths: output.strengths,
            improvements: output.improvements,
            nextSteps: output.next_steps,
            comparison: output.comparison || undefined,
            model: imageDataUrls.length ? env.NEBIUS_MODEL_VISION : env.NEBIUS_MODEL_TEXT,
            promptVersion: "v4",
            tokensIn,
            tokensOut,
            costEstimate: cost,
          },
        });
        await tx.version.update({
          where: { id: version.id },
          data: { status: "DONE" },
        });
      });
    } catch (e) {
      logger.error(
        { err: e, versionId: version.id, requestId: job.data.requestId },
        "review failed",
      );
      await prisma.$transaction(async (tx) => {
        const markedFailed = await tx.version.updateMany({
          where: { id: version.id, status: "PROCESSING" },
          data: {
            status: "FAILED",
            errorMessage: "Review tidak dapat diproses. Kamu bisa mencoba lagi.",
          },
        });
        if (markedFailed.count && job.data.quotaReserved) {
          const reservedPeriod = job.data.quotaPeriodStart
            ? parseQuotaPeriod(job.data.quotaPeriodStart)
            : new Date(version.createdAt.getFullYear(), version.createdAt.getMonth(), 1);
          await tx.usageQuota.updateMany({
            where: {
              userId: version.project.userId,
              periodStart: reservedPeriod,
              usedCount: { gt: 0 },
            },
            data: { usedCount: { decrement: 1 } },
          });
        }
      });
    }
  }
});
const shutdown = async () => {
  await boss.stop();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
