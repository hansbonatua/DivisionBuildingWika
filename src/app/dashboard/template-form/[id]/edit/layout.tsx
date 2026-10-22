import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageTemplateForm } from "@/lib/template-form/access";

export default async function EditTemplateFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canManageTemplateForm(user.role)) {
    redirect("/dashboard/template-form");
  }
  return <>{children}</>;
}
