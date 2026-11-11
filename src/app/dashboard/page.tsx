import { redirect } from "next/navigation";
import DashboardView from "@/components/dashboard/welcoming/DashboardView";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDashboardData } from "@/lib/dashboard/service";

export default async function DashboardHome() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const data = await getDashboardData(user);
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  return (
    <DashboardView
      data={data}
      user={{ name: user.name, role: user.role }}
      dateLabel={dateLabel}
    />
  );
}
