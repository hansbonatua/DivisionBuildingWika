import { redirect } from "next/navigation";
import { requireUser, UnauthenticatedError } from "@/lib/auth/current-user";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // `mslAccess` is carried to the shell so the future MSL sidebar entry can be
  // derived without another server round-trip or a layout refactor.
  let user: { name: string; role: string; mslAccess: boolean };
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect("/login");
    }
    throw error;
  }
  return (
    <DashboardShell user={user}>{children}</DashboardShell>
  );
}
