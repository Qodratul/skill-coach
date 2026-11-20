import type { Request, Response } from "express";
import { findPublicPortfolio, findPublicProjectStory } from "./portfolio.service.js";

export async function getPublicPortfolio(req: Request, res: Response) {
  const profile = await findPublicPortfolio(String(req.params.username));
  if (!profile)
    throw Object.assign(Error("Profil tidak ditemukan."), {
      status: 404,
      code: "NOT_FOUND",
    });
  res.locals.ok(profile);
}

export async function getPublicProjectStory(req: Request, res: Response) {
  const story = await findPublicProjectStory(
    String(req.params.username),
    String(req.params.projectId),
  );
  if (!story)
    throw Object.assign(Error("Proyek publik tidak ditemukan."), {
      status: 404,
      code: "NOT_FOUND",
    });
  res.locals.ok(story);
}
