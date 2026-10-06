"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type NavItem = {
  label: string;
  href: string;
  active?: boolean;
};

const internalNav: NavItem[] = [
  { label: "HOME", href: "#home", active: true },
  { label: "ABOUT", href: "#about" },
  { label: "OUR PROJECT", href: "#projects" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu(): void {
    setMenuOpen(false);
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-outline bg-surface shadow-sm transition-all duration-300">
      <div className="flex h-16 w-full items-center justify-between px-6 md:px-10 lg:px-14">
        <Link href="#home" className="flex items-center gap-3 focus:outline-none" aria-label="WIBEX Home">
          <Image
            src="/asset/logo-top.png"
            alt="PT Wijaya Karya (Persero) Tbk. - Building Division"
            width={180}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="hidden items-center space-x-8 md:flex" aria-label="Navigasi desktop">
          {internalNav.map((item) =>
            item.active ? (
              <Link
                key={item.label}
                href={item.href}
                className="border-b-2 border-secondary pb-1 text-sm font-bold tracking-wide text-secondary transition-colors duration-200"
              >
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="pb-1 text-sm font-medium tracking-wide text-primary/70 transition-colors duration-200 hover:text-secondary"
              >
                {item.label}
              </Link>
            ),
          )}
          <a
            href="https://sustainability.wika.co.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 pb-1 text-sm font-medium tracking-wide text-primary/70 transition-colors duration-200 hover:text-secondary"
          >
            SUSTAINABILITY
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
            >
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>
        </nav>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            aria-label={menuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={menuOpen}
            aria-controls="mobileMenu"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline text-primary hover:bg-background focus:outline-none md:hidden"
          >
            {menuOpen ? (
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
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
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
            )}
          </button>
          <Link
            href="/login"
            className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg bg-secondary px-3 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary md:h-10 md:px-4 md:text-sm"
          >
            <span>WIBEX Portal</span>
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
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </Link>
        </div>
      </div>

      {menuOpen ? (
        <div id="mobileMenu" className="border-t border-outline/30 bg-surface md:hidden">
          <nav className="flex flex-col px-6 py-3" aria-label="Navigasi mobile">
            {internalNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMenu}
                className={
                  item.active
                    ? "block rounded-lg border-b border-outline/20 px-2 py-3 text-sm font-bold tracking-wide text-secondary"
                    : "block rounded-lg border-b border-outline/20 px-2 py-3 text-sm font-medium tracking-wide text-primary/70 hover:text-secondary"
                }
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://sustainability.wika.co.id/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="block rounded-lg px-2 py-3 text-sm font-medium tracking-wide text-primary/70 hover:text-secondary"
            >
              SUSTAINABILITY
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
