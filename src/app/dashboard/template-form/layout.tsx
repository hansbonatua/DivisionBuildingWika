import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewTemplateForm } from "@/lib/template-form/access";

export default async function TemplateFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewTemplateForm(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
