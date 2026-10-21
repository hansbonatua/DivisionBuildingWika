import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewProgramKerja } from "@/lib/program-kerja/access";

// Page-level hardening for Program Kerja namespace (covers Summary, Manage, Add, Edit).
// API routes remain the final security boundary.
export default async function ProgramKerjaLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewProgramKerja(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
