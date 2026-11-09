import PdocSummaryPage from "@/components/dashboard/project-documentation/PdocSummaryPage";

// Summary Report is read-only for every viewer. The namespace layout already
// enforces authentication and DOCUMENTATION_VIEW.
export default function ProjectDocumentationSummaryPage() {
  return <PdocSummaryPage />;
}
