import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageProgramKerja } from "@/lib/program-kerja/access";

// Mutation page: Management may view Kelola, but must never reach Add.
export default async function NewProgramKerjaLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canManageProgramKerja(user.role)) {
    redirect("/dashboard/program-kerja/manage");
  }
  return <>{children}</>;
}
