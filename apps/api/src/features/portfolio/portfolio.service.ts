import { prisma } from "../../app.js";

const publicProjectSelect = {
  id: true,
  title: true,
  description: true,
  goal: true,
  skillType: true,
  createdAt: true,
  versions: {
    where: { status: "DONE" as const },
    orderBy: { versionNumber: "asc" as const },
    select: {
      id: true,
      versionNumber: true,
      createdAt: true,
      review: {
        select: {
          id: true,
          summary: true,
          scores: true,
          strengths: true,
          improvements: true,
          nextSteps: true,
          comparison: true,
          createdAt: true,
        },
      },
    },
  },
} as const;

export function findPublicPortfolio(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      displayName: true,
      skillField: true,
      projects: {
        where: { visibility: "PUBLIC" },
        select: publicProjectSelect,
      },
    },
  });
}

export async function findPublicProjectStory(username: string, projectId: string) {
  const owner = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      displayName: true,
      projects: {
        where: { id: projectId, visibility: "PUBLIC" },
        take: 1,
        select: publicProjectSelect,
      },
    },
  });
  const project = owner?.projects[0];
  return owner && project
    ? { username: owner.username, displayName: owner.displayName, project }
    : null;
}
