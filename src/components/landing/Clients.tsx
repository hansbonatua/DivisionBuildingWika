"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Client = {
  name: string;
  label: string;
  logo: string;
};

type ClientPublicPayload = {
  name?: unknown;
  shortName?: unknown;
  logoUrl?: unknown;
  logoAlt?: unknown;
};

const FALLBACK_CLIENTS: Client[] = [
  { name: "Kementerian PUPR", label: "KEMENTERIAN PEKERJAAN UMUM", logo: "/asset/partners/PUPR.png" },
  { name: "Otorita IKN", label: "OTORITA IKN", logo: "/asset/partners/Otorita IKN.webp" },
  { name: "Angkasa Pura", label: "ANGKASA PURA", logo: "/asset/partners/Angkasa Pura.png" },
  { name: "InJourney", label: "INJOURNEY", logo: "/asset/partners/Logo_InJourney.png" },
  { name: "Kemenkes", label: "KEMENKES", logo: "/asset/partners/Kemenkes.png" },
  { name: "Kemendikdasmen", label: "KEMDIKTISAINTEK", logo: "/asset/partners/kemendikdasmen.jpg" },
  { name: "Bank Mandiri", label: "BANK MANDIRI", logo: "/asset/partners/Copy of 01-Mandiri Master Brand Logo.png" },
  { name: "YKEP", label: "YAYASAN KARTIKA EKA PAKSI", logo: "/asset/partners/LOGO_YKEP.png" },
  {
    name: "Danantara Indonesia",
    label: "DANANTARA INDONESIA",
    logo: "/asset/partners/Danantara_Indonesia_Logo_vector (Color).png",
  },
];

const MOBILE_COLS = 2;
const DESKTOP_COLS = 4;

function toLandingClient(item: ClientPublicPayload): Client | null {
  if (typeof item.logoUrl !== "string" || item.logoUrl.length === 0) {
    return null;
  }
  if (typeof item.name !== "string" || item.name.length === 0) {
    return null;
  }
  const shortName = typeof item.shortName === "string" && item.shortName.length > 0 ? item.shortName : item.name;
  const logoAlt = typeof item.logoAlt === "string" && item.logoAlt.length > 0 ? item.logoAlt : shortName;
  return {
    // Cards are not clickable by design; link is intentionally not consumed.
    name: logoAlt,
    label: shortName,
    logo: item.logoUrl,
  };
}

export default function Clients() {
  // Fallback-first render keeps SSR/hydration deterministic; API swaps in when valid.
  const [clients, setClients] = useState<Client[]>(FALLBACK_CLIENTS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/clients/public")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<{ data?: unknown }>;
      })
      .then((body) => {
        if (cancelled || !Array.isArray(body.data)) {
          return;
        }
        const mapped = body.data
          .map((item) => toLandingClient(item as ClientPublicPayload))
          .filter((client): client is Client => client !== null);
        if (mapped.length > 0) {
          setClients(mapped);
        }
      })
      .catch(() => {
        // Silent fallback: static clients remain. No user-facing error on landing.
        console.warn("Landing clients use static fallback (public API unavailable).");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mobileSingleOrphan = clients.length % MOBILE_COLS === 1;
  const desktopSingleOrphan = clients.length % DESKTOP_COLS === 1;

  return (
    <section id="clients" className="w-full max-w-full overflow-hidden border-t border-outline/30 bg-surface py-20 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-6 text-center lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2">
            <span className="h-0.5 w-6 bg-secondary" />
            <span className="text-xs font-bold uppercase tracking-widest text-secondary">STRATEGIC ALLIANCES</span>
            <span className="h-0.5 w-6 bg-secondary" />
          </div>
          <h2 className="text-3xl font-bold text-primary md:text-4xl">Our Client</h2>
          <p className="mt-2 text-base text-primary/70">
            Trusted by leading sovereign authorities, state ministries, and Tier-1 development institutions.
          </p>
        </div>

        <div className="grid grid-cols-2 items-stretch justify-center gap-6 md:grid-cols-4">
          {clients.map((client, index) => {
            const isLast = index === clients.length - 1;
            const orphanClass = isLast
              ? [
                  mobileSingleOrphan
                    ? "max-md:col-span-2 max-md:w-[calc(50%-12px)] max-md:justify-self-center"
                    : "",
                  desktopSingleOrphan
                    ? "md:col-span-full md:w-[calc(25%-18px)] md:justify-self-center"
                    : "",
                ].join(" ")
              : "";
            const remote = !client.logo.startsWith("/");
            return (
              <div
                key={`${client.logo}-${client.name}-${index}`}
                className={`group flex min-h-[150px] flex-col items-center justify-center gap-3 rounded-xl border border-outline/30 bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${orphanClass}`}
              >
                <div className="relative h-14 w-full">
                  {remote ? (
                    // Remote CMS URLs bypass next/image so no remotePatterns config is needed.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={client.logo}
                      alt={`${client.name} — partner logo`}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Image
                      src={client.logo}
                      alt={`${client.name} — partner logo`}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      loading="lazy"
                      className="object-contain"
                    />
                  )}
                </div>
                <span className="text-center text-xs font-bold tracking-wide text-primary">{client.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
