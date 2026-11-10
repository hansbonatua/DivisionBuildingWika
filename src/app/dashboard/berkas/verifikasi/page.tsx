import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import BerkasVerifikasiPage from "@/components/dashboard/berkas/BerkasVerifikasiPage";

export default async function BerkasVerifikasiRoute() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <BerkasVerifikasiPage />;
}
