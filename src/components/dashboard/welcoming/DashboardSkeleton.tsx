const cards = Array.from({ length: 4 });

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat dashboard">
      <span className="sr-only">Memuat dashboard...</span>

      <div className="h-40 animate-pulse rounded-2xl bg-primary/10" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-2xl border border-outline/50 bg-background" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="h-80 animate-pulse rounded-2xl border border-outline/50 bg-background xl:col-span-2" />
        <div className="h-80 animate-pulse rounded-2xl border border-outline/50 bg-background" />
      </div>

      <div className="h-64 animate-pulse rounded-2xl border border-outline/50 bg-background" />
    </div>
  );
}
