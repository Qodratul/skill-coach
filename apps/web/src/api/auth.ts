import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthResultSchema, LoggedOutSchema, LoginInputSchema, ProfileSchema, QuotaSchema, RegisterInputSchema, UpdateProfileInputSchema, type LoginInput, type RegisterInput, type UpdateProfileInput } from "@skill-coach/shared";
import { apiFetch, queryRetry } from "./client";
import { keys } from "./keys";
import { session, useSession } from "./session";

export function useRegister() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      apiFetch("/auth/register", AuthResultSchema, {
        method: "POST",
        auth: false,
        body: JSON.stringify(RegisterInputSchema.parse(input)),
      }),
    onSuccess: ({ accessToken }) => {
      session.replace({ accessToken });
      client.clear();
    },
  });
}
export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch("/auth/login", AuthResultSchema, {
        method: "POST",
        auth: false,
        body: JSON.stringify(LoginInputSchema.parse(input)),
      }),
    onSuccess: ({ accessToken }) => {
      session.replace({ accessToken });
      client.clear();
    },
  });
}
export function useLogout() {
  const client = useQueryClient();
  return {
    logout: () => {
      const wasAuthenticated = session.hasSession || Boolean(session.accessToken);
      session.replace(null);
      client.clear();
      if (wasAuthenticated) {
        void apiFetch("/auth/logout", LoggedOutSchema, {
          method: "POST",
          auth: false,
          credentials: "include",
        }).catch(() => undefined);
      }
    },
  };
}
export function useProfile(options?: { enabled?: boolean }) {
  useSession();
  const hasSession = Boolean(session.accessToken || session.hasSession);
  return useQuery({ queryKey: keys.auth.me(), queryFn: ({ signal }) => apiFetch("/me", ProfileSchema, { signal }), enabled: options?.enabled !== false && hasSession, retry: queryRetry, staleTime: 1000 * 60 * 5 });
}
export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: UpdateProfileInput) => apiFetch("/me", ProfileSchema, { method: "PATCH", body: JSON.stringify(UpdateProfileInputSchema.parse(input)) }), onSuccess: (profile) => { client.setQueryData(keys.auth.me(), profile); } });
}
export function useQuota(options?: { enabled?: boolean }) {
  useSession();
  const hasSession = Boolean(session.accessToken || session.hasSession);
  return useQuery({ queryKey: keys.auth.quota(), queryFn: ({ signal }) => apiFetch("/me/quota", QuotaSchema, { signal }), enabled: options?.enabled !== false && hasSession, retry: queryRetry, staleTime: 1000 * 60 });
}
