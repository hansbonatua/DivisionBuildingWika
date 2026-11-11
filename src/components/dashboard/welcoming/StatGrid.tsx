import type { DashboardStats } from "@/lib/dashboard/service";
import StatCard from "./StatCard";

const numberFormat = new Intl.NumberFormat("id-ID");
const decimalFormat = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function StatGrid({ stats }: { stats: DashboardStats }) {
  const mslUnavailable = stats.mslAverage === null;
  const usersUnavailable = stats.activeUsers === null;

  return (
    <section aria-label="Statistik dashboard" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        statKey="projects"
        label="Total Proyek"
        value={numberFormat.format(stats.totalProjects)}
        hint="Proyek terdaftar"
      />
      <StatCard
        statKey="berkas"
        label="Berkas Selesai"
        value={numberFormat.format(stats.completedBerkas)}
        hint="Berkas berstatus selesai"
      />
      <StatCard
        statKey="msl"
        label="Skor MSL"
        value={mslUnavailable ? "-" : decimalFormat.format(stats.mslAverage ?? 0)}
        hint={mslUnavailable ? "Tidak tersedia" : "Rata-rata assessment tahun ini"}
        unavailable={mslUnavailable}
      />
      <StatCard
        statKey="users"
        label="Total User"
        value={usersUnavailable ? "-" : numberFormat.format(stats.activeUsers ?? 0)}
        hint={usersUnavailable ? "Tidak tersedia" : "Akun aktif"}
        unavailable={usersUnavailable}
      />
    </section>
  );
}
