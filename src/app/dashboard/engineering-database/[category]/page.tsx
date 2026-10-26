import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  ENGINEERING_DATABASE_CATEGORY_LABELS,
  canManageEngineeringDatabase,
  engineeringDatabaseCategoryFromSlug,
} from "@/lib/engineering-database/access";
import EngineeringDatabaseCategoryPage from "@/components/dashboard/engineering-database/EngineeringDatabaseCategoryPage";

// Dynamic category route: only the six canonical slugs resolve. Anything else
// is a 404 rather than an empty page — arbitrary slugs must never be treated as
// a category (and the API would reject them anyway).
export default async function EngineeringDatabaseCategoryRoutePage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = engineeringDatabaseCategoryFromSlug(slug);
  if (!category) {
    notFound();
  }

  const user = await getCurrentUser();
  const canManage = user ? canManageEngineeringDatabase(user.role) : false;

  return (
    <EngineeringDatabaseCategoryPage
      category={category}
      categoryLabel={ENGINEERING_DATABASE_CATEGORY_LABELS[category]}
      canManage={canManage}
    />
  );
}
