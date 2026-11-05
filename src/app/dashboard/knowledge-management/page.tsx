import { redirect } from "next/navigation";

// Knowledge Management is a group of three submenus; the group URL has no own
// content, so it opens the first submenu.
export default function KnowledgeManagementIndexPage() {
  redirect("/dashboard/knowledge-management/lesson-learn");
}
