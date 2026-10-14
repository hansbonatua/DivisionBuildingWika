import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageProgramKerja } from "@/lib/program-kerja/access";

// Page-level hardening for Kelola Program Kerja (covers manage, new and
// [id]/edit). API routes remain the final security boundary.
export default async function ProgramKerjaLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canManageProgramKerja(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
