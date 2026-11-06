import { redirect } from "next/navigation";

// The module root has no content of its own: Summary is the landing page
// (D-D-02), so a bare /dashboard/metode-kerja-standar request goes there.
export default function MetodeKerjaStandarIndexPage() {
  redirect("/dashboard/metode-kerja-standar/summary");
}
