import { useQuery } from "@tanstack/react-query";
import { PortfolioSchema, PublicProjectStorySchema } from "@skill-coach/shared";
import { apiFetch, queryRetry } from "./client";
import { keys } from "./keys";
export function usePortfolio(username: string) {
  return useQuery({ queryKey: keys.portfolio(username), enabled: Boolean(username), retry: queryRetry, queryFn: ({ signal }) => apiFetch(`/public/p/${encodeURIComponent(username)}`, PortfolioSchema, { auth: false, signal }) });
}

export function usePublicProjectStory(username: string, projectId: string) {
  return useQuery({
    queryKey: [...keys.portfolio(username), projectId],
    enabled: Boolean(username && projectId),
    retry: queryRetry,
    queryFn: ({ signal }) =>
      apiFetch(
        `/public/p/${encodeURIComponent(username)}/${encodeURIComponent(projectId)}`,
        PublicProjectStorySchema,
        { auth: false, signal },
      ),
  });
}
