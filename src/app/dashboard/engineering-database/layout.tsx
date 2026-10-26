import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewEngineeringDatabase } from "@/lib/engineering-database/access";

// Page-level hardening for the Engineering Databases namespace (covers Summary
// and every category list route). API routes remain the final security
// boundary. Deliberately uses the Engineering Database access helper, never
// the Master Project one: the Project role may also create/delete entries here.
export default async function EngineeringDatabaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewEngineeringDatabase(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
