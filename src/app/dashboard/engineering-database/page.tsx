import { redirect } from "next/navigation";

// Thin root route: every Engineering Database role can view the Summary, so the
// namespace root always lands there instead of 404-ing on a bare parent path.
export default function EngineeringDatabaseRootPage() {
  redirect("/dashboard/engineering-database/summary");
}
