import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewBerkas } from "@/lib/berkas/access";

export default async function BerkasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewBerkas(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
