import { useSyncExternalStore } from "react";
import type { AccessToken } from "@skill-coach/shared";

const SESSION_MARKER = "skill-coach.hasSession";
let accessToken: string | null = null;
let generation = 0;
const listeners = new Set<() => void>();
const boundaries = new Set<() => void>();
let hasSession = false;
try {
  hasSession = localStorage.getItem(SESSION_MARKER) === "1";
  sessionStorage.removeItem("skill-coach.refreshToken");
} catch {
  // Try the refresh cookie when browser storage cannot be read.
  hasSession = true;
}
const emit = () => listeners.forEach(listener => listener());
export const session = {
  get accessToken() { return accessToken; },
  get hasSession() { return hasSession; },
  get generation() { return generation; },
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  onBoundary(listener: () => void) { boundaries.add(listener); return () => { boundaries.delete(listener); }; },
  replace(tokens: AccessToken | null) {
    generation++;
    boundaries.forEach(listener => listener());
    session.rotate(tokens);
  },
  rotate(tokens: AccessToken | null) {
    accessToken = tokens?.accessToken ?? null;
    hasSession = Boolean(tokens);
    try {
      if (hasSession) localStorage.setItem(SESSION_MARKER, "1");
      else localStorage.removeItem(SESSION_MARKER);
    } catch {
      // The in-memory session still works for this page lifetime.
    }
    emit();
  },
};
export function useSession() {
  return useSyncExternalStore(session.subscribe, () => session.generation + ":" + Boolean(session.accessToken || session.hasSession), () => "0:false");
}
export function useAuthenticated() {
  useSession();
  return Boolean(session.accessToken || session.hasSession);
}
