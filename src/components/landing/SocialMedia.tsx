"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type SocialPost = {
  platform: string;
  account: string;
  caption: string;
  url: string;
  type: string;
  imageUrl: string;
  permalink: string;
};

// One Instagram account holding the posts the CMS curated for it.
// `profileUrl` is derived from the handle: the CMS does not store it.
type SocialAccount = {
  handle: string;
  profileUrl: string;
  posts: SocialPost[];
};

type LoadState = "loading" | "ready" | "error";

function profileUrlForHandle(handle: string): string {
  return `https://www.instagram.com/${handle.replace(/^@/, "")}/`;
}

function groupByAccount(posts: SocialPost[]): SocialAccount[] {
  const grouped = new Map<string, SocialPost[]>();
  for (const post of posts) {
    const bucket = grouped.get(post.account);
    if (bucket) {
      bucket.push(post);
    } else {
      grouped.set(post.account, [post]);
    }
  }
  return Array.from(grouped, ([handle, accountPosts]) => ({
    handle,
    profileUrl: profileUrlForHandle(handle),
    posts: accountPosts,
  }));
}

function CameraIcon() {
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
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function InstagramGlyph() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-secondary"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function ExternalLinkIcon() {
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
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

// Curated Instagram feed.
//
// The CMS is a MANUAL selection of original Instagram posts — there is no Graph
// API call, OAuth handshake or feed sync anywhere in this component. Each card
// shows an image WIBEX owns (or a URL the editor typed) and links out to the
// original post.
//
// Glyph fallback rule: a post is rendered with the Instagram glyph whenever it
// has no usable image — either `imageSource: "none"` on the record or simply a
// missing/unsupported `imageUrl`. The public payload deliberately does not carry
// `imageSource`, so the decision is made from the URL alone. No broken image is
// ever rendered.

type SocialPublicPayload = {
  platform?: unknown;
  account?: unknown;
  caption?: unknown;
  url?: unknown;
  type?: unknown;
  imageUrl?: unknown;
};

function toLandingPost(item: SocialPublicPayload): SocialPost | null {
  if (item.platform !== "instagram") {
    return null;
  }
  if (typeof item.account !== "string" || item.account.length === 0) {
    return null;
  }
  if (typeof item.url !== "string" || item.url.length === 0) {
    return null;
  }
  const caption = typeof item.caption === "string" ? item.caption : "";
  const type = typeof item.type === "string" && item.type.length > 0 ? item.type : "Image";
  const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl : "";
  return {
    platform: "instagram",
    account: item.account,
    caption,
    url: item.url,
    type,
    imageUrl,
    permalink: item.url,
  };
}

export default function SocialMedia() {
  // Empty-first render keeps SSR/hydration deterministic; the curated CMS feed
  // fills in. No Instagram post, caption or permalink is ever invented.
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/social-posts/public")
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
        const parsed = Array.isArray(body.data)
          ? body.data
              .map((item) => toLandingPost(item as SocialPublicPayload))
              .filter((post): post is SocialPost => post !== null)
          : [];
        setAccounts(groupByAccount(parsed));
        setStatus("ready");
      })
      .catch(() => {
        // No invented posts and no raw error text: a neutral empty state.
        if (!cancelled) {
          setAccounts([]);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="social-media" className="w-full max-w-full overflow-hidden bg-surface py-20 lg:py-28">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center justify-center gap-2">
            <span className="h-0.5 w-6 bg-secondary" />
            <span className="text-xs font-bold uppercase tracking-widest text-secondary">COMMUNICATIONS</span>
            <span className="h-0.5 w-6 bg-secondary" />
          </div>
          <h2 className="text-3xl font-bold text-primary md:text-4xl">Media Social</h2>
          <p className="mt-2 text-base text-primary/70">Follow our latest activities and corporate updates.</p>
          <div className="mt-6">
            <a
              href="https://www.instagram.com/ptwijayakarya/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary"
            >
              <span>Follow @ptwijayakarya</span>
              <ExternalLinkIcon />
            </a>
          </div>
        </div>

        {status === "loading" ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((slot) => (
              <div key={slot} className="h-80 animate-pulse rounded-2xl bg-background" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-outline/60 bg-background/40 px-6 py-12 text-center">
            <InstagramGlyph />
            <p className="text-sm font-semibold text-primary">
              {status === "error"
                ? "Unggahan media sosial sedang tidak dapat dimuat."
                : "Belum ada unggahan media sosial yang ditampilkan."}
            </p>
            <p className="text-xs text-primary/60">Silakan kembali lagi nanti.</p>
          </div>
        ) : (
        <div className="space-y-12">
          {accounts.map((account) => (
            <div key={account.handle}>
              <div className="mb-6 flex items-center gap-3 border-b border-outline/30 pb-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <CameraIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-lg font-bold text-primary">{account.handle}</span>
                </div>
                <a
                  href={account.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-semibold text-secondary hover:underline"
                >
                  Visit Profile
                </a>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {account.posts.map((post, index) => {
                  const imageSrc = post.imageUrl.trim();
                  const hasImage =
                    imageSrc.length > 0 &&
                    (imageSrc.startsWith("/") ||
                      imageSrc.startsWith("http://") ||
                      imageSrc.startsWith("https://"));
                  const altText = post.caption || post.account || "Social media post";
                  const linkHref = post.url || post.permalink;
                  const imageNode = hasImage ? (
                    imageSrc.startsWith("/") ? (
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
                        <Image
                          src={imageSrc}
                          alt={altText}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          loading="lazy"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
                        {/* Remote CMS URLs bypass next/image so no remotePatterns config is needed. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageSrc}
                          alt={altText}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )
                  ) : (
                    // Curated without an image: glyph fallback, never a broken
                    // <img>. Layout is kept as it was before the curated feed.
                    <InstagramGlyph />
                  );
                  return (
                    <div
                      key={`${account.handle}-${post.permalink}-${index}`}
                      className="flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-outline/40 bg-white p-6 text-center shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                    >
                      {hasImage && linkHref ? (
                        <a
                          href={linkHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full"
                          aria-label={altText}
                        >
                          {imageNode}
                        </a>
                      ) : (
                        imageNode
                      )}
                      <p className="text-sm font-semibold text-primary">{account.handle}</p>
                      {post.caption ? (
                        <p className="line-clamp-2 text-xs text-primary/70">{post.caption}</p>
                      ) : null}
                      <a
                        href={linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-outline/50 px-4 py-2 text-xs font-semibold text-secondary transition-colors hover:bg-secondary hover:text-white"
                      >
                        <span>Lihat di Instagram</span>
                        <ExternalLinkIcon />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
