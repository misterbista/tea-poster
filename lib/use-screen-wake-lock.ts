"use client";

import { useEffect } from "react";

export function useScreenWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;

    let disposed = false;
    let requesting = false;
    let retryWhenSettled = false;
    let sentinel: WakeLockSentinel | null = null;

    const release = () => {
      const current = sentinel;
      sentinel = null;
      if (current && !current.released) void current.release().catch(() => {});
    };

    const request = async () => {
      if (disposed || requesting || sentinel || document.visibilityState !== "visible") return;
      requesting = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (disposed || document.visibilityState !== "visible") {
          await next.release();
          return;
        }
        sentinel = next;
        next.addEventListener("release", () => {
          if (sentinel === next) sentinel = null;
        }, { once: true });
      } catch {
        // Wake locks are optional and may be unavailable due to browser or device policy.
      } finally {
        requesting = false;
        if (retryWhenSettled) {
          retryWhenSettled = false;
          if (!disposed && document.visibilityState === "visible") void request();
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (requesting) retryWhenSettled = true;
        else void request();
      } else {
        retryWhenSettled = false;
        release();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    void request();

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      release();
    };
  }, [enabled]);
}
