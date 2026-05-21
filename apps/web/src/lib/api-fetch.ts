"use client";

import { useAuthStore } from "@/stores/auth-store";

/**
 * fetch wrapper that surfaces session expiry via useAuthStore.
 * 401 → expired=true. Next successful response clears the flag.
 * Use for write-path API calls inside an active workout, where redirecting
 * to /sign-in would lose unsaved state.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  const store = useAuthStore.getState();
  if (res.status === 401) {
    if (!store.expired) store.setExpired(true);
  } else if (res.ok && store.expired) {
    store.clear();
  }
  return res;
}
