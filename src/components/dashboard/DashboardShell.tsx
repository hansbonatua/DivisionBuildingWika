"use client";

import { useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-clip bg-surface text-primary antialiased">
      <DashboardHeader sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex min-h-0 flex-1">
        <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Tutup navigasi"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-primary/45 md:hidden"
          />
        ) : null}
        <main className="min-w-0 flex-1 overflow-y-auto bg-surface p-6 lg:p-8">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
