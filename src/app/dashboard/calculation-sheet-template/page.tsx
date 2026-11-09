import { redirect } from "next/navigation";

// Calculation Sheet Template is a multi-page module: Summary Report is the
// landing page, and each category lives at /calculation-sheet-template/<id>.
export default function CalculationSheetTemplateRoutePage() {
  redirect("/dashboard/calculation-sheet-template/summary");
}
