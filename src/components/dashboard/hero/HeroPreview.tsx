import { shortTitle, type HeroSlide } from "@/lib/demo/hero";

type HeroPreviewProps = {
  slide: HeroSlide;
  activeIndex: number;
  total: number;
};

function previewLines(title: string): [string, string] {
  const words = shortTitle(title).split(" ");
  return [words[0] ?? "", words.slice(1).join(" ")];
}

export default function HeroPreview({ slide, activeIndex, total }: HeroPreviewProps) {
  const [first, rest] = previewLines(slide.title);
  return (
    <div className="border-b border-outline bg-slate-900 p-5">
      <div className="relative flex aspect-[16/8] flex-col justify-end overflow-hidden rounded-lg border border-slate-700 p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-transparent to-transparent" />
        <div className="absolute right-4 top-4 flex items-center gap-2 rounded border border-white/20 bg-black/40 px-3 py-1 font-mono text-xs text-white/90 backdrop-blur-md">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-amber-400"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          <span>PREVIEW HERO 1440 x 720</span>
        </div>
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="mb-1">
            <h3 className="select-none text-4xl font-bold leading-[0.9] tracking-tight text-white drop-shadow-md sm:text-5xl">
              <span className="block">{first}</span>
              <span className="block">{rest}</span>
            </h3>
          </div>
        </div>
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
          <span className="font-mono text-xs text-white/70">
            {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded ${i === activeIndex ? "w-6 bg-amber-500" : "w-2 bg-white/40"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
