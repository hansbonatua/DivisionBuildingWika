import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewMetodeKerja } from "@/lib/metode-kerja-standar/access";

// Namespace guard for Metode Kerja Standar. It is its own top-level module (not
// nested under Program Kerja), so it carries its own layout-level VIEW check in
// addition to the API guard. Every role with METODE_KERJA_VIEW may read; only
// Admin/Head Office may write, which is decided per page and enforced by the API.
export default async function MetodeKerjaStandarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewMetodeKerja(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
