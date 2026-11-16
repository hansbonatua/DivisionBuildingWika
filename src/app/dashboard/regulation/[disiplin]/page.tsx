import { notFound } from "next/navigation";
import RegulationDisiplinPage from "@/components/dashboard/regulation/RegulationDisiplinPage";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageRegulation } from "@/lib/regulation/access";
import { getRegulationDisiplinBySlug } from "@/lib/regulation/constants";

// Only the five canonical slugs resolve. Capabilities are resolved on the
// server from the session role; the client only decides which controls render.
// The API remains authoritative for every mutation.
export default async function RegulationDisiplinRoutePage({
  params,
}: {
  params: Promise<{ disiplin: string }>;
}) {
  const { disiplin: slug } = await params;
  const disiplin = getRegulationDisiplinBySlug(slug);
  if (!disiplin) {
    notFound();
  }

  const user = await getCurrentUser();
  const role = user?.role ?? "";

  return (
    <RegulationDisiplinPage
      disiplinKey={disiplin.key}
      disiplinSlug={disiplin.slug}
      disiplinName={disiplin.name}
      canManage={canManageRegulation(role)}
    />
  );
}
