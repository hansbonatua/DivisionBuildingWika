import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  canManageEngineeringDatabase,
  engineeringDatabaseCategoryFromSlug,
} from "@/lib/engineering-database/access";

// Create-page guard: authenticated + manage role (Admin, Head Office, Project).
// Management is read-only and is sent back to the category list. An unknown
// category slug is a 404, never an implicit category.
export default async function NewEngineeringDatabaseEntryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ category: string }>;
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
