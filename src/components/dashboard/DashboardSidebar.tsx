"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
};

function MenuIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

const landingSubMenu: SidebarItem[] = [
  {
    label: "Hero Banner",
    href: "/dashboard/hero",
    icon: (
      <MenuIcon>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </MenuIcon>
    ),
  },
  {
    label: "Our Project",
    href: "/dashboard/projects",
    icon: (
      <MenuIcon>
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </MenuIcon>
    ),
  },
  {
    label: "Green Building Certificate",
    href: "/dashboard/green-building",
    icon: (
      <MenuIcon>
        <circle cx="12" cy="8" r="6" />
        <path d="M15.5 13 17 22l-5-3-5 3 1.5-9" />
      </MenuIcon>
    ),
  },
  {
    label: "Media Sosial",
    href: "/dashboard/social-media",
    icon: (
      <MenuIcon>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
        <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
      </MenuIcon>
    ),
  },
  {
    label: "Our Client",
    href: "/dashboard/clients",
    icon: (
      <MenuIcon>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </MenuIcon>
    ),
  },
];

const adminMenu: SidebarItem[] = [
  {
    label: "User Directory",
    href: "/dashboard/users",
    icon: (
      <MenuIcon>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </MenuIcon>
    ),
  },
];

export default function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const landingRoutes = landingSubMenu.map((item) => item.href);
  const isLandingRoute = landingRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const [landingOpen, setLandingOpen] = useState(isLandingRoute);

  useEffect(() => {
    if (isLandingRoute) {
      setLandingOpen(true);
    }
  }, [pathname, isLandingRoute]);

  function isActivePath(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderItem(item: SidebarItem) {
    const isActive = isActivePath(item.href);
    if (isActive) {
      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={onClose}
          aria-current="page"
          className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-secondary transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className="text-secondary">{item.icon}</span>
            <span>{item.label}</span>
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
        </Link>
      );
    }
    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={onClose}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        <span className="text-slate-400">{item.icon}</span>
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <aside
      id="dashboardSidebar"
      className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 select-none flex-col border-r border-slate-200 bg-white transition-transform duration-300 ${
        open ? "translate-x-0 shadow-[8px_0_24px_rgba(0,0,0,0.12)]" : "-translate-x-full"
      } md:sticky md:top-20 md:z-40 md:h-[calc(100svh-5rem)] md:translate-x-0 md:shadow-none`}
    >
      <div className="flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              DASHBOARD ADMIN
            </div>
            <div className="px-1">
              <button
                type="button"
                aria-expanded={landingOpen}
                aria-controls="landing-page-manager-menu"
                onClick={() => setLandingOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-secondary">
                    <MenuIcon>
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M3 9h18" />
                      <path d="M9 21V9" />
                    </MenuIcon>
                  </span>
                  <span>Landing Page Manager</span>
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={`text-slate-400 transition-transform duration-200 ${landingOpen ? "rotate-180" : "rotate-0"}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>

          {landingOpen ? (
            <div id="landing-page-manager-menu">
              <nav className="ml-4 space-y-1 border-l-2 border-slate-100 pl-3" aria-label="Landing Page Manager">
                {landingSubMenu.map(renderItem)}
              </nav>
            </div>
          ) : null}

          <div className="border-t border-slate-200 pt-2">
            <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              ADMINISTRASI
            </div>
            <nav className="space-y-1 px-1">
              {adminMenu.map((item) => {
                const isActive = isActivePath(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      isActive
                        ? "flex items-center justify-between rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-bold text-secondary transition-colors"
                        : "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    }
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={isActive ? "text-secondary" : "text-slate-400"}>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
      <Link
        href="/"
        onClick={onClose}
        className="flex w-full shrink-0 items-center justify-center gap-2 border-t border-slate-200 px-5 py-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" x2="9" y1="12" y2="12" />
        </svg>
        <span>Logout</span>
      </Link>
    </aside>
  );
}
