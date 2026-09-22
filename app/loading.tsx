import Image from "next/image";

export default function Loading() {
  return (
    <main className="tea-shell flex min-h-dvh items-center justify-center px-6">
      <div className="flex flex-col items-center text-center">
        <div className="tea-logo-frame relative size-48 overflow-hidden rounded-[2rem] border-2 border-accent/60 bg-[#fffaf0] shadow-2xl shadow-primary/15">
          <Image
            src="/ChatGPT Image Sep 22, 2026 at 11_38_07 AM.png"
            alt="Tea-Poster's logo"
            fill
            sizes="192px"
            className="object-contain"
            priority
          />
        </div>
        <p className="mt-6 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-accent">
          steeping the tea
        </p>
      </div>
    </main>
  );
}
