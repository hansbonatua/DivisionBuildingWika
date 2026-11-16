import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewRegulation } from "@/lib/regulation/access";

// Namespace guard for Standard & Regulation. Every role with REGULATION_VIEW
// may read and download; only Admin/Head Office may write, which is resolved per
// page and enforced again by the API.
export default async function RegulationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewRegulation(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
