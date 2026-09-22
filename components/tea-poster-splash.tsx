import Image from "next/image";

export function TeaPosterSplash() {
  return (
    <main className="tea-shell flex min-h-dvh items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="tea-logo-frame relative aspect-square w-[min(78vw,19rem)] overflow-hidden rounded-[2rem] border border-accent/35 bg-[#fffaf0] shadow-2xl shadow-primary/15">
          <Image
            src="/ChatGPT Image Sep 22, 2026 at 11_38_07 AM.png"
            alt="Tea-Poster's logo"
            fill
            sizes="(max-width: 640px) 78vw, 304px"
            className="object-contain"
            priority
          />
        </div>
        <p className="mt-7 text-xs font-medium tracking-wide text-muted-foreground">
          steeping the tea
        </p>
        <div className="mt-5 flex items-center gap-1.5" role="status" aria-label="Loading Tea-Poster">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
          <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
        </div>
      </div>
    </main>
  );
}
