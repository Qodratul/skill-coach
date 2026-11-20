import { z } from "zod";

export const REVIEW_CRITERIA = {
  UI: ["Hierarki visual", "Konsistensi", "Aksesibilitas", "Kejelasan CTA"],
  CODE: ["Kebenaran logika", "Keterbacaan", "Penanganan error", "Struktur kode"],
  ESSAY: ["Kekuatan argumen", "Alur gagasan", "Bukti pendukung", "Gaya bahasa"],
} as const;

const ScoreSchema = z.number().int().min(1).max(10);

export const ImprovementItemSchema = z
  .object({
    title: z.string().min(3).max(80),
    problem: z.string().min(10).max(400),
    why_it_matters: z.string().min(10).max(300),
    example_fix: z.string().min(5).max(500),
    location: z.string().max(120).optional(),
  })
  .strict();

const ReviewOutputBaseSchema = z
  .object({
    summary: z.string().min(20).max(600),
    strengths: z.array(z.string().min(8).max(260)).min(2).max(4),
    improvements: z.array(ImprovementItemSchema).min(1).max(5),
    next_steps: z.tuple([
      z.string().min(8).max(180),
      z.string().min(8).max(180),
      z.string().min(8).max(180),
    ]),
    comparison: z
      .object({
        score_delta: z.record(z.string().max(60), z.number().min(-9).max(9)),
        progress_commentary: z.string().min(8).max(240),
      })
      .strict()
      .nullable(),
  })
  .strict();

export function reviewOutputSchemaFor(skillType: keyof typeof REVIEW_CRITERIA) {
  const scores = Object.fromEntries(
    REVIEW_CRITERIA[skillType].map((criterion) => [criterion, ScoreSchema]),
  );
  return ReviewOutputBaseSchema.extend({ scores: z.object(scores).strict() });
}
