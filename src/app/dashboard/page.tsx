import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageCms } from "@/lib/cms/access";
import { canManageUsers } from "@/lib/users/access";

type HomeTile = {
  label: string;
  href: string;
  description: string;
};

// Landing Page CMS management tiles — Admin only (CMS_MANAGE). These are
// management surfaces, not public landing content.
const cmsTiles: HomeTile[] = [
  { label: "Hero Banner", href: "/dashboard/hero", description: "Kelola hero banner landing page" },
  { label: "Our Project", href: "/dashboard/projects", description: "Kelola daftar proyek landing page" },
  {
    label: "Green Building Certificate",
    href: "/dashboard/green-building",
    description: "Kelola sertifikat green building",
  },
  { label: "Media Sosial", href: "/dashboard/social-media", description: "Kelola konten Instagram" },
  { label: "Our Client", href: "/dashboard/clients", description: "Kelola logo klien dan partner" },
];

// User Control tile — Admin only (USER_MANAGE).
const userTile: HomeTile = {
  label: "User Directory",
  href: "/dashboard/users",
  description: "Kelola pengguna CMS",
};

export default async function DashboardHome() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const sections: HomeTile[] = [
    ...(canManageCms(user.role) ? cmsTiles : []),
    ...(canManageUsers(user.role) ? [userTile] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Dashboard</h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">Selamat datang di WIBEX CMS Studio</p>
      </div>
      {sections.length === 0 ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">
            Tidak ada menu cepat untuk peran Anda. Gunakan navigasi di samping.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-lg border border-outline bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-sm font-bold text-primary group-hover:text-secondary">
                {section.label}
              </div>
              <div className="mt-1 text-xs text-primary/70">{section.description}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
