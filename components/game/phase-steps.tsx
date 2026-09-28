"use client";

import { CheckIcon } from "lucide-react";
import type { Phase } from "@/components/game/types";

export function PhaseSteps({ phase }: { phase: Phase }) {
  const steps: { id: Phase; label: string }[] = [
    { id: "setup", label: "Players" },
    { id: "deal", label: "Peek" },
    { id: "discuss", label: "Talk" },
  ];
  const currentIndex = steps.findIndex((step) => step.id === phase);

  return <nav aria-label="Game progress" className="tea-progress mb-7"><span className="tea-progress-line" aria-hidden="true" /><ol className="relative grid grid-cols-3 gap-2">{steps.map((step, index) => { const complete = index < currentIndex; const current = index === currentIndex; return <li key={step.id} aria-current={current ? "step" : undefined} className={`tea-progress-step ${current ? "is-current" : ""} ${complete ? "is-complete" : ""}`}><span className="tea-progress-dot">{complete && <CheckIcon className="size-3" />}</span><span className="tea-progress-label">{step.label}</span></li>; })}</ol></nav>;
}
