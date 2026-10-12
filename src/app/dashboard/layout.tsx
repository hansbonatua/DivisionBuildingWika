import { redirect } from "next/navigation";
import { requireUser, UnauthenticatedError } from "@/lib/auth/current-user";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user: { name: string; role: string };
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect("/login");
    }
    throw error;
  }
  return (
    <DashboardShell user={{ name: user.name, role: user.role }}>{children}</DashboardShell>
  );
}
