"use client";

import Link from "next/link";
import type { LearningContentListItem } from "@/components/dashboard/learning/types";

// One catalogue card. Sharing opens the internal detail page; Training and
// Certificate open the external link in a new tab. The external card is an
// anchor (keyboard + middle-click work) whose click is forwarded to
// window.open, so the new tab is opened explicitly and never in-place.

function CardBody({ item }: { item: LearningContentListItem }) {
  const isSharing = item.type === "sharing";

  return (
    <>
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        {item.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail_url}
            alt={item.judul}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
            Tanpa gambar
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-secondary shadow-sm">
          {item.kategori.nama}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-primary">
          {item.judul}
        </h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-primary/60">
          {item.deskripsi && item.deskripsi.trim() !== ""
            ? item.deskripsi
            : "Belum ada deskripsi."}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-[11px] font-semibold text-primary/50">
          <span>
            {isSharing
              ? `${item.attachment_count} lampiran`
              : "Link eksternal"}
          </span>
          <span className="text-secondary">
            {isSharing ? "Lihat detail →" : "Buka link ↗"}
          </span>
        </div>
      </div>
    </>
  );
}

const CARD_CLASS =
  "group flex h-full flex-col overflow-hidden rounded-xl border border-outline bg-surface text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40";

export default function LearningCard({
  item,
}: {
  item: LearningContentListItem;
}) {
  if (item.type === "sharing") {
    return (
      <Link
        href={`/dashboard/learning/sharing/${item.id}`}
        className={CARD_CLASS}
        aria-label={`Buka detail ${item.judul}`}
      >
        <CardBody item={item} />
      </Link>
    );
  }

  const externalUrl = item.external_url;

  function handleExternalClick(
    event: React.MouseEvent<HTMLAnchorElement>,
  ): void {
    if (!externalUrl) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    window.open(externalUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <a
      href={externalUrl ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleExternalClick}
      className={CARD_CLASS}
      aria-label={`Buka ${item.judul} di tab baru`}
    >
      <CardBody item={item} />
    </a>
  );
}
