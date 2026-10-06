"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const features = [
  {
    title: "Aman & Terpercaya",
    description:"Sistem dengan keamanan berlapis dan autentikasi terpusat",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Mendukung Produktivitas",
    description: "Akses cepat untuk kebutuhan proyek dan konstruksi",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    title: "Terintegrasi",
    description: "Satu Platform, Seluruh Informasi",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
        <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
      </svg>
    ),
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[#020d1f] text-white antialiased">
      <header className="w-full border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="WIBEX Beranda" className="shrink-0">
          <Image
            src="/asset/logo-top.png"
            alt="WIKA Building Division"
            width={220}
            height={48}
            className="h-10 w-auto object-contain sm:h-12"
            priority
          />
        </Link>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            SSL SECURED
          </span>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
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
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Beranda
          </Link>
        </div>
        </div>
      </header>

      <main className="relative flex flex-1 items-center overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          <Image
            src="/asset/about.jpg"
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020d1f]/95 via-[#020d1f]/80 to-[#020d1f]/55" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-14">
          <div className="order-2 max-w-xl lg:order-1">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Building Sustainable Future Through Innovation
            </h1>
            <ul className="mt-8 space-y-5">
              {features.map((feature) => (
                <li key={feature.title} className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-sky-300">
                    {feature.icon}
                  </span>
                  <span className="pt-0.5">
                    <span className="block text-sm font-bold text-white">{feature.title}</span>
                    {feature.description ? (
                      <span className="mt-0.5 block text-[13px] leading-snug text-white/70">
                        {feature.description}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-1 w-full max-w-md justify-self-center lg:order-2 lg:justify-self-end">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xl sm:p-6">
              <div className="mb-5 flex min-h-[96px] items-center justify-center">
                <Image
                  src="/asset/wibex-icon.png"
                  alt="WIBEX Logo"
                  width={80}
                  height={80}
                  className="mx-auto block h-20 w-20 object-contain"
                  priority
                />
              </div>
              <h2 className="mx-auto max-w-sm text-center text-xl font-bold leading-snug tracking-tight text-primary sm:text-2xl">
                Portal Sistem Informasi Rekayasa &amp; Konstruksi
              </h2>
              <p className="mb-6 mt-2.5 text-center text-sm text-slate-500">
                Akses autentikasi terpusat Building Division
              </p>
              <form onSubmit={handleSubmit} className="mt-2 space-y-4">
                <div>
                  <label
                    htmlFor="loginEmail"
                    className="mb-1 block text-xs font-semibold tracking-wider text-slate-600"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      id="loginEmail"
                      name="email"
                      type="text"
                      autoComplete="username"
                      placeholder="nama@wika.co.id"
                      className="h-11 w-full rounded-lg border border-outline bg-white pl-10 pr-10 text-sm font-medium text-primary placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="loginPassword"
                    className="mb-1 block text-xs font-semibold tracking-wider text-slate-600"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      id="loginPassword"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="h-11 w-full rounded-lg border border-outline bg-white pl-10 pr-10 text-sm font-medium text-primary placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
                    >
                      {showPassword ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4-8 11-8" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor="rememberWorkstation"
                    className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-slate-500"
                  >
                    <input
                      type="checkbox"
                      id="rememberWorkstation"
                      name="remember"
                      className="h-4 w-4 shrink-0 rounded border-slate-300"
                    />
                    Ingat Sesi Kerja
                  </label>
                </div>
                <button
                  type="submit"
                  className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold tracking-wide text-white shadow-sm transition-colors duration-150 hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  MASUK KE SISTEM
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
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-slate-200/70 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
        <Image
          src="/asset/logo-top.png"
          alt="WIKA Building Division"
          width={180}
          height={40}
          className="h-8 w-auto object-contain"
        />
        <p className="text-center text-xs text-slate-500 sm:text-right">
          © 2026 WIKA Building Division
        </p>
        </div>
      </footer>
    </div>
  );
}
