import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getCstCategory } from "@/lib/calculation-sheet-template/constants";
import CalculationSheetTemplatePage from "@/components/dashboard/calculation-sheet-template/CalculationSheetTemplatePage";

// One category per page. Unknown ids are a 404 instead of an empty page; the
// API rejects the same unknown category, so the page can never show a category
// the server does not recognise.
export default async function CalculationSheetCategoryRoutePage({
  params,
}: {
  params: Promise<{ kategori: string }>;
}) {
  const { kategori: slug } = await params;
  const kategori = getCstCategory(slug);
  if (!kategori) {
    notFound();
  }

  const user = await getCurrentUser();
  const canManage = user
    ? hasPermission(user.role, PERMISSIONS.CALCULATION_SHEET_MANAGE)
    : false;

  // Remount per category so drafts/state from the previous category can never
  // leak into the next one.
  return (
    <CalculationSheetTemplatePage
      key={kategori.id}
      kategori={kategori}
      canManage={canManage}
    />
  );
}
