import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  canManageEngineeringDatabase,
  engineeringDatabaseCategoryFromSlug,
} from "@/lib/engineering-database/access";

// Edit-page guard: authenticated + manage role (Admin, Head Office, Project).
// Management is read-only and is sent back to the category list.
export default async function EditEngineeringDatabaseEntryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ category: string; id: string }>;
}) {
  const { category: slug } = await params;
  if (!engineeringDatabaseCategoryFromSlug(slug)) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canManageEngineeringDatabase(user.role)) {
    redirect(`/dashboard/engineering-database/${slug}`);
  }
  return <>{children}</>;
}
