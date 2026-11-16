import { redirect } from "next/navigation";

// V1 has no Regulation summary page. The module root opens the first discipline,
// matching the first sidebar entry.
export default function RegulationRootPage() {
  redirect("/dashboard/regulation/prosedur-wika");
}
