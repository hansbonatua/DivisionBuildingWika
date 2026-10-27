import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageCms } from "@/lib/cms/access";

// Page-level hardening for the Our Client CMS namespace (list, add, edit).
// API routes remain the final security boundary. The public landing page reads
// /api/clients/public and never touches this namespace.
export default async function ClientsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canManageCms(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
