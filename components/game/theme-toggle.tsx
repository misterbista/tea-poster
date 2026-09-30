"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const sweepActiveRef = useRef(false);

  useEffect(() => {
    let savedTheme: string | null = null;
    try {
      savedTheme = window.localStorage.getItem("tea-posters-theme");
    } catch {
      // The system preference remains available when storage is disabled.
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextIsDark = savedTheme === "dark" || (savedTheme === null && prefersDark);
    const frame = window.requestAnimationFrame(() => {
      document.documentElement.classList.toggle("dark", nextIsDark);
      document.documentElement.style.colorScheme = nextIsDark ? "dark" : "light";
      setIsDark(nextIsDark);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = (event: MouseEvent<HTMLButtonElement>) => {
    if (sweepActiveRef.current) return;
    haptic("tap");
    const nextIsDark = !isDark;
    const root = document.documentElement;
    const updateTheme = () => {
      root.classList.toggle("dark", nextIsDark);
      root.style.colorScheme = nextIsDark ? "dark" : "light";
      setIsDark(nextIsDark);
    };

    try {
      window.localStorage.setItem("tea-posters-theme", nextIsDark ? "dark" : "light");
    } catch {
      // The current session still changes theme when storage is disabled.
    }

    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    const shouldAnimate = event.detail > 0 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && shouldAnimate) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = bounds.left + bounds.width / 2;
      const y = bounds.top + bounds.height / 2;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.style.setProperty("--theme-sweep-x", `${x}px`);
      root.style.setProperty("--theme-sweep-y", `${y}px`);
      root.style.setProperty("--theme-sweep-radius", `${radius}px`);
      root.classList.add("theme-sweeping");
      sweepActiveRef.current = true;
      const transition = document.startViewTransition(() => flushSync(updateTheme));
      void transition.finished.catch(() => {}).finally(() => {
        root.classList.remove("theme-sweeping");
        root.style.removeProperty("--theme-sweep-x");
        root.style.removeProperty("--theme-sweep-y");
        root.style.removeProperty("--theme-sweep-radius");
        sweepActiveRef.current = false;
      });
      return;
    }

    if (shouldAnimate) root.classList.add("theme-transition-fallback");
    updateTheme();
    if (shouldAnimate) {
      transitionTimeoutRef.current = window.setTimeout(() => {
        root.classList.remove("theme-transition-fallback");
        transitionTimeoutRef.current = null;
      }, 220);
    }
  };

  return (
    <Button type="button" variant="outline" size="icon" className="size-11 rounded-full border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-primary" onClick={toggleTheme} aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}>
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
