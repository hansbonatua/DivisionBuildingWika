import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  canDeleteMetodeKerja,
  canManageMetodeKerja,
} from "@/lib/metode-kerja-standar/access";
import { getDisiplinBySlug } from "@/lib/metode-kerja-standar/constants";
import MetodeKerjaDisiplinPage from "@/components/dashboard/metode-kerja-standar/MetodeKerjaDisiplinPage";

// Dynamic discipline route: only the six canonical slugs resolve. Any other slug
// is a 404 instead of an empty page — the API rejects unknown disciplines, and
// the page must not pretend an arbitrary slug is a discipline.
//
// Capabilities are resolved on the server from the session role; the client
// component only decides which controls to render. The API stays authoritative.
export default async function MetodeKerjaDisiplinRoutePage({
  params,
}: {
  params: Promise<{ disiplin: string }>;
}) {
  const { disiplin: slug } = await params;
  const disiplin = getDisiplinBySlug(slug);
  if (!disiplin) {
    notFound();
  }

  const user = await getCurrentUser();
  const role = user?.role ?? "";

  return (
    <MetodeKerjaDisiplinPage
      disiplinCode={disiplin.code}
      disiplinSlug={disiplin.slug}
      disiplinName={disiplin.name}
      canManage={canManageMetodeKerja(role)}
      canDelete={canDeleteMetodeKerja(role)}
    />
  );
}
