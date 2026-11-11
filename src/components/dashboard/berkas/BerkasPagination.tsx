"use client";

export default function BerkasPagination({
  page,
  totalPages,
  totalData,
  loading,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalData: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-outline/70 bg-background/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] font-semibold text-primary/60">
        Menampilkan halaman {page} dari {safeTotalPages} · {totalData} Berkas
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={loading || page <= 1}
          className="rounded-lg border border-outline bg-white px-3 py-2 text-[11px] font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sebelumnya
        </button>
        <span className="min-w-14 text-center text-[11px] font-bold text-primary/70">
          {page} / {safeTotalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={loading || totalPages === 0 || page >= totalPages}
          className="rounded-lg border border-outline bg-white px-3 py-2 text-[11px] font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
