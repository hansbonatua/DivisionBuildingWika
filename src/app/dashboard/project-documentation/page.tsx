import { redirect } from "next/navigation";

// The module root is only a navigation entry point. The namespace layout still
// enforces authentication and DOCUMENTATION_VIEW before this redirect runs.
export default function ProjectDocumentationRoutePage() {
  redirect("/dashboard/project-documentation/rekap-bulanan");
}
