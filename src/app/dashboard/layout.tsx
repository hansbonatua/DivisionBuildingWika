import { redirect } from "next/navigation";
import { requireUser, UnauthenticatedError, type SafeUser } from "@/lib/auth/current-user";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // `mslAccess` is carried to the shell so the future MSL sidebar entry can be
  // derived without another server round-trip or a layout refactor.
  // Keep the full SafeUser shape: the shell needs photoUrl so the header can
  // render the uploaded photo instead of initials.
  let user: SafeUser;
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
