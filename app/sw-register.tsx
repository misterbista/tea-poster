"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

const UPDATE_TOAST = "teaposters-update";

export function ServiceWorkerRegister({ gameActive }: { gameActive: boolean }) {
  const [updateReady, setUpdateReady] = useState(false);

  const gameActiveRef = useRef(gameActive);
  useLayoutEffect(() => {
    gameActiveRef.current = gameActive;
  }, [gameActive]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let checking = false;
    const cleanups: (() => void)[] = [];
    const hadController = Boolean(navigator.serviceWorker.controller);

    const controllerChanged = () => {
      // Another tab may accept the update. Never reload this game's screen.
      if (hadController) setUpdateReady(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", controllerChanged);

    const checkForUpdate = async () => {
      if (!registration || checking || document.visibilityState !== "visible" || !navigator.onLine) return;
      checking = true;
      try {
        await registration.update();
      } catch (error) {
        console.warn("TeaPosters could not check for an update.", error);
      } finally {
        checking = false;
      }
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((result) => {
        if (disposed) return;
        registration = result;
        const inspectWaiting = () => {
          if (!disposed && result.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
        };
        const watchInstalling = () => {
          const worker = result.installing;
          if (!worker) return;
          const changed = () => {
            if (worker.state === "installed") inspectWaiting();
          };
          worker.addEventListener("statechange", changed);
          cleanups.push(() => worker.removeEventListener("statechange", changed));
        };
        result.addEventListener("updatefound", watchInstalling);
        cleanups.push(() => result.removeEventListener("updatefound", watchInstalling));
        watchInstalling();
        inspectWaiting();
        void checkForUpdate();
      })
      .catch((error: unknown) => {
        console.error("TeaPosters could not register its service worker.", error);
      });

    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChanged);
    };
  }, []);

  useEffect(() => {
    if (!updateReady || gameActive) return;
    const refresh = async () => {
      if (gameActiveRef.current) return;
      if (!navigator.onLine) throw new Error("The device is offline.");
      const registration = await navigator.serviceWorker.getRegistration();
      if (gameActiveRef.current) return;
      if (registration?.waiting) {
        // Reload only after activation, and only the tab that requested it.
        const onControllerChange = () => {
          navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
          if (!gameActiveRef.current) window.location.reload();
        };
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload();
      }
    };
    toast.message("Update available", {
      id: UPDATE_TOAST,
      duration: Infinity,
      description: "Refresh to use the latest version of TeaPosters.",
      action: {
        label: "Refresh",
        onClick: (event) => {
          event.preventDefault();
          void refresh().catch((error: unknown) => {
            console.error("TeaPosters could not apply its update.", error);
            toast.error("Could not update. Try again when you’re online.");
          });
        },
      },
    });
    return () => { toast.dismiss(UPDATE_TOAST); };
  }, [updateReady, gameActive]);

  return null;
}
