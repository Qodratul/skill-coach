import { prisma, boss, REVIEW_QUEUE, logger } from "../../app.js";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PDFParse } from "pdf-parse";
import { env } from "../../config.js";

const fail = (message: string, status: number, code: string, details?: unknown) =>
  Object.assign(Error(message), { status, code, details });
const periodKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;

export async function createVersion(
  userId: string,
  projectId: string,
  data: Record<string, unknown>,
  requestId?: string,
) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) throw fail("Proyek tidak ditemukan.", 404, "NOT_FOUND");
  if (data.fileKey && !String(data.fileKey).startsWith(`${userId}/`))
    throw fail("File tidak valid.", 403, "FORBIDDEN");
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);
  const quotaWhere = { userId_periodStart: { userId, periodStart } };
  const version = await prisma.$transaction(async (tx) => {
    const quota = await tx.usageQuota.upsert({
      where: quotaWhere,
      create: { userId, periodStart, limitCount: env.MONTHLY_REVIEW_LIMIT },
      update: {},
    });
    const reserved = await tx.usageQuota.updateMany({
      where: {
        userId,
        periodStart,
        usedCount: { lt: quota.limitCount },
      },
      data: { usedCount: { increment: 1 } },
    });
    if (!reserved.count)
      throw fail("Batas kuota review bulanan kamu telah habis.", 429, "QUOTA_EXCEEDED", {
        limit: quota.limitCount,
        resetAt: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1,
        ).toISOString(),
      });
    const last = await tx.version.findFirst({
      where: { projectId },
      orderBy: { versionNumber: "desc" },
    });
    return tx.version.create({
      data: { projectId, versionNumber: (last?.versionNumber || 0) + 1, ...data },
    });
  });
  let jobId: string | null;
  try {
    jobId = await boss.send(
      REVIEW_QUEUE,
      {
        versionId: version.id,
        requestId,
        quotaPeriodStart: periodKey(periodStart),
        quotaReserved: true,
      },
      { retryLimit: 2, retryDelay: 5, retryBackoff: true },
    );
  } catch {
    jobId = null;
  }
  if (!jobId) {
    await prisma.$transaction(async (tx) => {
      await tx.usageQuota.updateMany({
        where: { userId, periodStart, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
      await tx.version.update({
        where: { id: version.id },
        data: { status: "FAILED", errorMessage: "Job review gagal dimasukkan ke antrean." },
      });
    });
    throw fail("Antrean review sedang tidak tersedia.", 503, "QUEUE_UNAVAILABLE");
  }
  return version;
}

export async function findVersion(userId: string, versionId: string) {
  const version = await prisma.version.findFirst({
    where: { id: versionId, project: { userId } },
    include: { review: true, project: { select: { userId: true } } },
  });
  if (
    !version ||
    version.status !== "DONE" ||
    version.fileType !== "application/pdf" ||
    !version.fileKey ||
    version.textContent
  )
    return version;

  if (
    !env.STORAGE_ENDPOINT ||
    !env.STORAGE_ACCESS_KEY ||
    !env.STORAGE_SECRET_KEY ||
    !version.fileKey.startsWith(`${version.project.userId}/`)
  )
    return version;

  const storage = new S3Client({
    region: "auto",
    endpoint: env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY,
      secretAccessKey: env.STORAGE_SECRET_KEY,
    },
  });
  try {
    const metadata = await storage.send(
      new HeadObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: version.fileKey }),
    );
    if (
      (metadata.ContentLength ?? 0) > 5 * 1024 * 1024 ||
      metadata.ContentType !== "application/pdf"
    )
      return version;
    const object = await storage.send(
      new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: version.fileKey }),
    );
    if (!object.Body) return version;
    const parser = new PDFParse({
      data: Buffer.from(await object.Body.transformToByteArray()),
    });
    let previewText: string;
    try {
      previewText = (await parser.getText({ first: 1, last: 30 })).text.slice(0, 8000);
    } finally {
      await parser.destroy();
    }
    if (!previewText.trim()) return version;
    return await prisma.version.update({
      where: { id: version.id },
      data: { textContent: previewText },
      include: { review: true, project: { select: { userId: true } } },
    });
  } catch (error) {
    logger.warn({ err: error, versionId }, "unable to generate PDF preview");
    return version;
  }
}

export async function createVersionPreviewUrl(userId: string, versionId: string) {
  const version = await prisma.version.findFirst({
    where: { id: versionId, project: { userId } },
    select: { fileKey: true, fileType: true, project: { select: { userId: true } } },
  });
  if (!version) throw fail("Versi tidak ditemukan.", 404, "NOT_FOUND");
  if (!version.fileKey || !version.fileType?.startsWith("image/"))
    throw fail("File ini tidak memiliki pratinjau gambar.", 404, "PREVIEW_NOT_FOUND");
  if (!version.fileKey.startsWith(`${version.project.userId}/`))
    throw fail("File tidak valid.", 403, "FORBIDDEN");
  if (!env.STORAGE_ENDPOINT || !env.STORAGE_ACCESS_KEY || !env.STORAGE_SECRET_KEY)
    throw fail("Storage belum dikonfigurasi.", 503, "STORAGE_UNAVAILABLE");

  const storage = new S3Client({
    region: "auto",
    endpoint: env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY,
      secretAccessKey: env.STORAGE_SECRET_KEY,
    },
  });
  const url = await getSignedUrl(
    storage,
    new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: version.fileKey,
      ResponseContentType: version.fileType,
      ResponseContentDisposition: "inline",
    }),
    { expiresIn: 300 },
  );
  return { url, fileType: version.fileType, expiresIn: 300 };
}

export async function retryVersion(
  userId: string,
  versionId: string,
  requestId?: string,
) {
  const version = await prisma.version.findFirst({
    where: { id: versionId, project: { userId } },
  });
  if (!version) throw fail("Versi tidak ditemukan.", 404, "NOT_FOUND");
  if (version.status !== "FAILED")
    throw fail("Hanya review gagal yang dapat diulang.", 409, "INVALID_STATE");
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const quotaWhere = { userId_periodStart: { userId, periodStart } };
  await prisma.$transaction(async (tx) => {
    const quota = await tx.usageQuota.upsert({
      where: quotaWhere,
      create: { userId, periodStart, limitCount: env.MONTHLY_REVIEW_LIMIT },
      update: {},
    });
    const reserved = await tx.usageQuota.updateMany({
      where: { userId, periodStart, usedCount: { lt: quota.limitCount } },
      data: { usedCount: { increment: 1 } },
    });
    if (!reserved.count)
      throw fail("Batas kuota review bulanan kamu telah habis.", 429, "QUOTA_EXCEEDED", {
        limit: quota.limitCount,
        resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      });
    const transitioned = await tx.version.updateMany({
      where: { id: version.id, status: "FAILED" },
      data: { status: "QUEUED", errorMessage: null },
    });
    if (!transitioned.count) throw fail("Review sedang diproses.", 409, "INVALID_STATE");
  });
  let jobId: string | null;
  try {
    jobId = await boss.send(
      REVIEW_QUEUE,
      {
        versionId: version.id,
        requestId,
        quotaPeriodStart: periodKey(periodStart),
        quotaReserved: true,
      },
      { retryLimit: 2, retryDelay: 5, retryBackoff: true },
    );
  } catch {
    jobId = null;
  }
  if (!jobId) {
    await prisma.$transaction(async (tx) => {
      await tx.usageQuota.updateMany({
        where: { userId, periodStart, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
      await tx.version.update({
        where: { id: version.id },
        data: { status: "FAILED", errorMessage: "Job review gagal dimasukkan ke antrean." },
      });
    });
    throw fail("Antrean review sedang tidak tersedia.", 503, "QUEUE_UNAVAILABLE");
  }
  return { id: version.id, status: "QUEUED" as const };
}

export async function projectProgress(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      versions: {
        where: { status: "DONE" },
        orderBy: { versionNumber: "asc" },
        include: { review: true },
      },
    },
  });
  if (!project) throw fail("Proyek tidak ditemukan.", 404, "NOT_FOUND");
  return project.versions.map((version) => ({
    versionId: version.id,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt,
    scores: version.review?.scores,
  }));
}
