import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { VersionSchema, VersionPreviewSchema, RetryVersionSchema, ProgressSchema, CreateVersionInputSchema, type CreateVersionInput, type Version } from "@skill-coach/shared";
import { apiFetch, queryRetry } from "./client";
import { keys } from "./keys";
import { useAuthenticated } from "./session";
export function useVersion(id: string, isEnabled = true) {
  const authenticated = useAuthenticated();
  const client = useQueryClient();
  const terminal = useRef("");
  const query = useQuery({ queryKey: keys.versions.detail(id), enabled: authenticated && isEnabled && Boolean(id), retry: queryRetry,
    queryFn: ({ signal }) => apiFetch(`/versions/${encodeURIComponent(id)}`, VersionSchema, { signal }),
    refetchInterval: query => query.state.status === "error" ? false : ["queued", "processing"].includes(query.state.data?.status ?? "") ? 3000 : false });
  const status = query.data?.status;
  useEffect(() => {
    if (status !== "done" && status !== "failed") { terminal.current = ""; return; }
    const marker = `${id}:${status}`;
    if (terminal.current === marker) return;
    terminal.current = marker;
    void client.invalidateQueries({ queryKey: keys.projects.all() });
    void client.invalidateQueries({ queryKey: keys.auth.quota() });
    void client.invalidateQueries({ queryKey: ["portfolio"] });
  }, [id, status, client]);
  return query;
}
export function useVersionPreview(id: string, enabled = true) {
  const authenticated = useAuthenticated();
  return useQuery({
    queryKey: keys.versions.preview(id),
    enabled: authenticated && enabled && Boolean(id),
    retry: queryRetry,
    staleTime: 4 * 60 * 1000,
    queryFn: ({ signal }) =>
      apiFetch(`/versions/${encodeURIComponent(id)}/preview`, VersionPreviewSchema, {
        signal,
      }),
  });
}
export function useProgress(projectId: string) {
  const enabled = useAuthenticated();
  return useQuery({ queryKey: keys.versions.progress(projectId), enabled: enabled && Boolean(projectId), retry: queryRetry, queryFn: ({ signal }) => apiFetch(`/projects/${encodeURIComponent(projectId)}/progress`, ProgressSchema, { signal }) });
}
export function useCreateVersion(projectId: string) {
  const client = useQueryClient();
  return useMutation({ retry: false, mutationFn: (input: CreateVersionInput) => createVersionRequest(projectId, input), onSuccess: version => {
    client.setQueryData(keys.versions.detail(version.id), version);
    void client.invalidateQueries({ queryKey: keys.projects.all() });
    void client.invalidateQueries({ queryKey: keys.auth.quota() });
  } });
}
export function createVersionRequest(projectId: string, input: CreateVersionInput) {
  return apiFetch(`/projects/${encodeURIComponent(projectId)}/versions`, VersionSchema, {
    method: "POST",
    body: JSON.stringify(CreateVersionInputSchema.parse(input)),
  });
}
export function useRetryVersion() {
  const client = useQueryClient();
  return useMutation({ retry: false, mutationFn: (id: string) => apiFetch(`/versions/${encodeURIComponent(id)}/retry`, RetryVersionSchema, { method: "POST" }), onSuccess: result => {
    client.setQueryData<Version>(keys.versions.detail(result.id), old => old ? { ...old, status: result.status, errorMessage: null } : undefined);
    void client.invalidateQueries({ queryKey: keys.versions.detail(result.id) });
    void client.invalidateQueries({ queryKey: keys.projects.all() });
  } });
}
