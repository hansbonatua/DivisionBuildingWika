import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getLearningContent,
  LearningNotFoundError,
} from "@/lib/learning/service";
import {
  formatLearningFileSize,
  learningFileTypeLabel,
  type LearningContentDetail,
} from "@/components/dashboard/learning/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function SharingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let detail: LearningContentDetail | null = null;
  try {
    detail = await getLearningContent(
      { id: user.id, role: user.role, status: user.status },
      id,
    );
  } catch (error) {
    if (error instanceof LearningNotFoundError) {
      notFound();
    }
    throw error;
  }
  if (!detail || detail.type !== "sharing") {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/learning/sharing"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary transition-colors hover:text-primary"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        </svg>
        Kembali ke Sharing Session
      </Link>

      <div className="rounded-xl border border-outline bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
            Core Enterprise
          </span>
          <span className="text-xs text-primary/50">•</span>
          <span className="text-xs text-primary/50">Sharing Session</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          {detail.judul}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-secondary">
            {detail.kategori.nama}
          </span>
          <span className="text-xs text-primary/45">
            Diperbarui {formatDate(detail.updated_at)}
          </span>
        </div>
        {detail.deskripsi && detail.deskripsi.trim() !== "" ? (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-primary/75">
            {detail.deskripsi}
          </p>
        ) : null}
      </div>

      {detail.video_embed_url ? (
        <section className="overflow-hidden rounded-xl border border-outline bg-black shadow-sm">
          <div className="relative aspect-video w-full">
            <iframe
              src={detail.video_embed_url}
              title={`Video ${detail.judul}`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-outline bg-surface p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-primary">Lampiran</h2>
          <span className="text-[11px] font-semibold text-primary/45">
            {detail.attachments.length} file
          </span>
        </div>

        {detail.attachments.length === 0 ? (
          <p className="text-xs text-primary/50">
            Tidak ada lampiran pada sesi ini.
          </p>
        ) : (
          <ul className="space-y-2">
            {detail.attachments.map((attachment) => (
              <li key={attachment.id}>
                <a
                  href={`/api/learning/attachments/${attachment.id}/file`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-outline/60 bg-white px-3.5 py-3 transition-colors hover:border-secondary/40 hover:bg-background/60"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold text-secondary">
                      {learningFileTypeLabel(attachment.file_name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-primary">
                        {attachment.nama}
                      </span>
                      <span className="block truncate text-[11px] text-primary/45">
                        {attachment.file_name} ·{" "}
                        {formatLearningFileSize(attachment.file_size_bytes)}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-secondary">
                    Unduh ↓
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
