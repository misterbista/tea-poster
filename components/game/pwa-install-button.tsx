"use client";

import { DownloadIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const measureInstallState = () => {
      const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsIos(isIosDevice);
      setIsStandalone(standalone);
    };
    const frame = window.requestAnimationFrame(measureInstallState);
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  if (isStandalone || (!installPrompt && !isIos)) return null;

  const install = async () => {
    haptic("tap");
    if (isIos) {
      toast.message("Install TeaPosters from Safari", { description: "Tap Share, then choose Add to Home Screen." });
      return;
    }
    if (!installPrompt) return;
    const prompt = installPrompt;
    // Browser install events are single-use, including when dismissed.
    setInstallPrompt(null);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (error) {
      console.error("TeaPosters install prompt failed.", error);
      toast.error("Your browser could not show the install prompt.");
    }
  };

  return <Button type="button" variant="ghost" size="icon" className="size-11 rounded-full text-muted-foreground hover:bg-muted hover:text-primary" onClick={() => void install()} aria-label="Install TeaPosters" title="Install TeaPosters"><DownloadIcon /></Button>;
}
