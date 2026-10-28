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

const MOBILE_COLS = 2;

type LoadState = "loading" | "ready" | "error";
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
  // Empty-first render keeps SSR/hydration deterministic; the CMS feed fills in.
  // No partner logo or name is ever invented.
  const [clients, setClients] = useState<Client[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");

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
        if (cancelled) {
          return;
        }
        const mapped = Array.isArray(body.data)
          ? body.data
              .map((item) => toLandingClient(item as ClientPublicPayload))
              .filter((client): client is Client => client !== null)
          : [];
        setClients(mapped);
        setStatus("ready");
      })
      .catch(() => {
        // No invented logos and no raw error text: a neutral empty state.
        if (!cancelled) {
          setClients([]);
          setStatus("error");
        }
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

        {status === "loading" ? (
          <div className="grid grid-cols-2 items-stretch justify-center gap-6 md:grid-cols-4" aria-busy="true">
            {[0, 1, 2, 3].map((slot) => (
              <div key={slot} className="h-[150px] animate-pulse rounded-xl bg-background" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline/60 bg-background/40 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-primary">
              {status === "error"
                ? "Data klien sedang tidak dapat dimuat."
                : "Belum ada klien yang ditampilkan."}
            </p>
            <p className="text-xs text-primary/60">Silakan kembali lagi nanti.</p>
          </div>
        ) : (
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
        )}
      </div>
    </section>
  );
}
