import Link from "next/link";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

type QuickLink = {
  label: string;
  description: string;
  href: string;
};

function buildQuickLinks(role: string): QuickLink[] {
  const links: QuickLink[] = [];

  if (hasPermission(role, PERMISSIONS.BERKAS_CREATE)) {
    links.push({
      label: "Ajukan Berkas",
      description: "Upload dan ajukan dokumen baru",
      href: "/dashboard/berkas/ajukan",
    });
  } else if (hasPermission(role, PERMISSIONS.BERKAS_VIEW)) {
    links.push({
      label: "Berkas",
      description: "Lihat dokumen pengajuan",
      href: "/dashboard/berkas/ajukan",
    });
  }

  if (hasPermission(role, PERMISSIONS.BERKAS_VALIDATE)) {
    links.push({
      label: "Verifikasi Berkas",
      description: "Tindak lanjuti dokumen yang menunggu TTD",
      href: "/dashboard/berkas/verifikasi",
    });
  }
  if (hasPermission(role, PERMISSIONS.MASTER_PROJECT_VIEW)) {
    links.push({
      label: "Master Project",
      description: "Kelola direktori proyek",
      href: "/dashboard/master-project/manage",
    });
  }
  if (hasPermission(role, PERMISSIONS.DOCUMENTATION_VIEW)) {
    links.push({
      label: "Project Documentation",
      description: "Lihat rekap dokumentasi bulanan",
      href: "/dashboard/project-documentation/rekap-bulanan",
    });
  }
  if (hasPermission(role, PERMISSIONS.PROGRAM_KERJA_VIEW)) {
    links.push({
      label: "Program Kerja",
      description: "Pantau rencana dan realisasi",
      href: "/dashboard/program-kerja/summary",
    });
  }
  if (hasPermission(role, PERMISSIONS.KNOWLEDGE_MANAGEMENT_VIEW)) {
    links.push({
      label: "Knowledge Management",
      description: "Lesson learn dan best practice",
      href: "/dashboard/knowledge-management/lesson-learn",
    });
  }
  if (hasPermission(role, PERMISSIONS.USER_MANAGE)) {
    links.push({
      label: "Kelola User",
      description: "Atur akun dan akses pengguna",
      href: "/dashboard/users",
    });
  }

  return links;
}

export default function QuickLinks({ role }: { role: string }) {
  const links = buildQuickLinks(role);

  return (
    <section className="rounded-2xl border border-outline/70 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">Shortcut</p>
      <h2 className="mt-1 text-lg font-bold tracking-tight text-primary">Quick Links</h2>

      {links.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-outline bg-background/40 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-primary">Tidak ada modul yang tersedia untuk peran Anda.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between gap-3 rounded-xl border border-outline/50 px-3.5 py-3 transition-colors hover:border-secondary/40 hover:bg-blue-50/40"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-primary">{link.label}</span>
                <span className="mt-0.5 block truncate text-[11px] text-primary/50">{link.description}</span>
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4 shrink-0 text-primary/30 transition-colors group-hover:text-secondary"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
