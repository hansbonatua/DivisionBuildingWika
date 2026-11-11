"use client";

import type { DashboardData } from "@/lib/dashboard/service";
import ActionCenter from "./ActionCenter";
import ActivityFeed from "./ActivityFeed";
import QuickLinks from "./QuickLinks";
import StatGrid from "./StatGrid";
import WelcomeCard from "./WelcomeCard";

export default function DashboardView({
  data,
  user,
  dateLabel,
}: {
  data: DashboardData;
  user: { name: string; role: string };
  dateLabel: string;
}) {
  return (
    <div className="space-y-6">
      <WelcomeCard name={user.name} role={user.role} dateLabel={dateLabel} />
      <StatGrid stats={data.stats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <ActionCenter actions={data.actions} />
        </div>
        <QuickLinks role={user.role} />
      </div>

      <ActivityFeed activities={data.activities} />
    </div>
  );
}
