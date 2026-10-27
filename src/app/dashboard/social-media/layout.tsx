import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageCms } from "@/lib/cms/access";

// Page-level hardening for the Media Sosial CMS namespace (list, add, edit).
// API routes remain the final security boundary. The public landing page reads
// /api/social-posts/public and never touches this namespace.
export default async function SocialMediaLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canManageCms(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
