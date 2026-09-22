import Image from "next/image";

export function TeaPosterSplash() {
  return (
    <main className="tea-shell flex min-h-dvh items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="tea-logo-frame relative aspect-square w-[min(78vw,19rem)] overflow-hidden rounded-[2rem]">
          <Image
            src="/ChatGPT Image Sep 22, 2026 at 06_55_47 PM.png"
            alt="TeaPosters logo"
            fill
            sizes="(max-width: 640px) 78vw, 304px"
            className="object-contain"
            priority
          />
        </div>
        <p className="tea-brand-subline mt-7 text-xs text-muted-foreground">
          pass &amp; play
        </p>
        <div className="mt-5 flex items-center gap-1.5" role="status" aria-label="Loading TeaPosters">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
          <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
        </div>
      </div>
    </main>
  );
}
