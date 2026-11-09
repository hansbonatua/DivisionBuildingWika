import CalculationSheetSummaryPage from "@/components/dashboard/calculation-sheet-template/CalculationSheetSummaryPage";

// Summary Report is the CST landing page. The layout already enforces auth and
// CALCULATION_SHEET_VIEW; Summary is read-only for every viewer.
export default function CalculationSheetSummaryRoutePage() {
  return <CalculationSheetSummaryPage />;
}
