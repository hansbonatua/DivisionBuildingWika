"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type DashboardHeaderProps = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export default function DashboardHeader({ sidebarOpen, onToggleSidebar }: DashboardHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileOpen) {
      return;
    }
    function handlePointerDown(event: MouseEvent): void {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline/50 bg-surface px-4 shadow-sm sm:h-20 md:px-6">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={sidebarOpen ? "Tutup navigasi" : "Buka navigasi"}
          aria-expanded={sidebarOpen}
          aria-controls="dashboardSidebar"
          onClick={onToggleSidebar}
          className="-ml-2 rounded p-2 text-primary transition-colors hover:bg-background md:hidden"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>
        <div className="flex h-full items-center">
          <Image
            src="/asset/wibex-header.png"
            alt="WIBEX"
            width={200}
            height={56}
            className="h-10 w-auto sm:h-14"
            priority
          />
        </div>
      </div>
      <div ref={profileRef} className="relative">
        <button
          type="button"
          aria-expanded={profileOpen}
          aria-haspopup="menu"
          aria-label="Menu profil"
          onClick={() => setProfileOpen((prev) => !prev)}
          className="flex cursor-pointer items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-100 text-xs font-bold text-secondary">
            RT
          </div>
          <div className="hidden flex-col text-left sm:flex">
            <span className="text-xs font-bold leading-tight text-slate-900">R. Triyanto S.T.</span>
            <span className="mt-0.5 text-[11px] font-medium leading-tight text-slate-500">Superadmin CMS</span>
          </div>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`ml-1 text-slate-400 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {profileOpen ? (
          <div
            role="menu"
            aria-label="Menu profil"
            className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-outline/60 bg-white py-2 shadow-lg"
          >
            <div className="px-4 py-2">
              <p className="truncate text-xs font-bold text-slate-900">R. Triyanto S.T.</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Superadmin CMS</p>
            </div>
            <div className="my-1 border-t border-outline/40" />
            <Link
              href="/dashboard/profile/edit"
              role="menuitem"
              onClick={() => setProfileOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
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
                className="text-slate-400"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Edit Profile</span>
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
