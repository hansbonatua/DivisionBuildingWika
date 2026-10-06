import Image from "next/image";
import Link from "next/link";

const legalLinks: string[] = [
  "Privacy Policy",
  "Terms of Service",
  "Compliance & ESG",
  "Investor Relations",
  "Site Map",
];

function ShareIcon() {
  return (
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  );
}

function PlayIcon() {
  return (
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
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function TagIcon() {
  return (
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
      <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l8.58-8.58a1 1 0 0 0 0-1.42L12 2z" />
      <circle cx="7" cy="7" r="1.5" />
    </svg>
  );
}

function LocationIcon() {
  return (
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
      className="mt-0.5 shrink-0 text-secondary"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function MailIcon() {
  return (
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
      className="shrink-0 text-secondary"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function CallIcon() {
  return (
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
      className="shrink-0 text-secondary"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="relative w-full max-w-full overflow-hidden border-t border-outline/20 bg-primary text-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-12 border-b border-white/20 pb-12 md:grid-cols-12">
          <div className="md:col-span-6">
            <Link href="#home" className="mb-4 inline-flex items-center gap-3" aria-label="WIBEX Home">
              <Image
                src="/asset/logo-bottom.png"
                alt="PT Wijaya Karya (Persero) Tbk."
                width={180}
                height={40}
                className="block h-10 w-auto object-contain"
              />
            </Link>
            <p className="mb-6 max-w-md text-sm leading-relaxed text-white/60">
              Delivering critical sovereign civil engineering, sustainable urban transformations, and monumental
              structural landmarks with institutional precision.
            </p>
            <div className="flex items-center space-x-3">
              <Link
                href="#"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white/60 transition-colors hover:border-secondary hover:text-white"
              >
                <ShareIcon />
              </Link>
              <Link
                href="#"
                aria-label="YouTube"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white/60 transition-colors hover:border-secondary hover:text-white"
              >
                <PlayIcon />
              </Link>
              <Link
                href="#"
                aria-label="X Network"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white/60 transition-colors hover:border-secondary hover:text-white"
              >
                <TagIcon />
              </Link>
            </div>
          </div>

          <div className="md:col-span-6">
            <div className="mb-4 text-lg font-semibold text-white">Executive Headquarters</div>
            <div className="space-y-3 text-sm text-white/60">
              <div className="flex items-start gap-2">
                <LocationIcon />
                <span>
                  Building Division — Jl. DI. Panjaitan No.9-10, RT.1/RW.11, Cipinang Cempedak, Jatinegara, Jakarta
                  Timur 13340
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MailIcon />
                <a href="mailto:corporate@wibex.co.id" className="break-all transition-colors hover:text-white">
                  wibexwika@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <CallIcon />
                <a href="tel:+62215550199" className="transition-colors hover:text-white">
                  +62 21 555 0199
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 text-sm">
          <p className="text-center text-white/60 md:text-left">
            © 2026 WIBEX Infrastructure. All rights reserved. Precision engineering &amp; institutional development.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {legalLinks.map((label) => (
              <Link
                key={label}
                href="#"
                className="text-sm text-white/60 transition-colors duration-200 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
