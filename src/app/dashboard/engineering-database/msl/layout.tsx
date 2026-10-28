import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewMsl } from "@/lib/msl/access";

// Page-level guard for MSL Engineering. The API routes remain the final
// security boundary (they re-check canViewMsl/canManageMsl); this only prevents
// rendering the page for roles without MSL view access.
//
// Admin: allowed. Head Office: allowed (read-only). Management: only with the
// per-user mslAccess capability. Project: denied. Anonymous: login flow.
export default async function MslLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewMsl({ role: user.role, mslAccess: user.mslAccess })) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
