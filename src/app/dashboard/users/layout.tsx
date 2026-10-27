import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageUsers } from "@/lib/users/access";

// Page-level hardening for the User Control namespace (directory, add, edit).
// API routes remain the final security boundary; this only prevents rendering
// the UI. Self-profile (/dashboard/profile/edit) is a separate route outside
// this namespace and stays available to every active role.
export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canManageUsers(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
