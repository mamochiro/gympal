"use client";

import { gcSynced, getPending, getPendingCount, markFailed, markSynced } from "@/lib/workout-queue";
import { useViewportStore } from "@/stores/viewport-store";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

export function useWorkoutSync(workoutId: string) {
  const qc = useQueryClient();
  const initViewport = useViewportStore((s) => s.init);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const flushingRef = useRef(false);

  const flush = useCallback(async () => {
    if (flushingRef.current || !navigator.onLine) return;
    const pending = await getPending(workoutId);
    if (pending.length === 0) return;
    flushingRef.current = true;
    try {
      const ops = pending
        .filter((e): e is typeof e & { id: number } => e.id !== undefined)
        .map((e) => ({
          seq: e.id,
          type: e.operation.type,
          payload: e.operation.payload,
        }));
      const res = await fetch(`/api/workouts/${workoutId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: pending[0]?.clientId ?? "",
          lastSyncSeq: 0,
          pendingOps: ops,
        }),
      });
      if (res.ok) {
        const { data: result } = await res.json();
        if (result.accepted?.length) await markSynced(result.accepted);
        if (result.rejected?.length) {
          for (const { seq, reason } of result.rejected as { seq: number; reason: string }[]) {
            await markFailed(seq, reason);
          }
        }
        qc.invalidateQueries({ queryKey: ["workout", workoutId] });
      }
    } catch {
      // Silent — will retry on next flush
    } finally {
      flushingRef.current = false;
      const count = await getPendingCount(workoutId);
      setPendingCount(count);
    }
  }, [workoutId, qc]);

  useEffect(() => {
    gcSynced().catch(() => {});
  }, []);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      flush();
    };
    const onOffline = () => setIsOnline(false);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);
    setIsOnline(navigator.onLine);

    const cleanup = initViewport();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
      cleanup();
    };
  }, [flush, initViewport]);

  useEffect(() => {
    const iv = setInterval(async () => {
      const count = await getPendingCount(workoutId);
      setPendingCount(count);
    }, 3000);
    return () => clearInterval(iv);
  }, [workoutId]);

  const showSavedLocally = !isOnline || pendingCount > 0;
  return { pendingCount, isOnline, showSavedLocally, flush };
}
