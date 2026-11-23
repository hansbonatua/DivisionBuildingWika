import { LEARNING_URL_MAX_LENGTH } from "@/lib/learning/constants";

// Video URL normalisation for Building Learning Center.
//
// The browser may paste any YouTube/Vimeo share link. Only a canonical EMBED
// URL is ever stored, and it is rebuilt here from a constant template plus an
// id that matched a deliberately narrow pattern. The raw input never reaches
// the database or an iframe `src`, which is what removes the XSS surface:
// quotes, angle brackets, `javascript:` and `data:` cannot survive the id
// regex, and the host allowlist blocks every other origin.
//
// Pure module (no network, no Blob SDK) so it can be unit-tested and reused by
// the service layer only.

export type VideoProvider = "youtube" | "vimeo";

export type NormalizedVideo = {
  provider: VideoProvider;
  videoId: string;
  embedUrl: string;
};

// YouTube ids are exactly 11 URL-safe base64 characters.
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
// Vimeo ids are numeric and bounded well below 2^53.
const VIMEO_ID_RE = /^[0-9]{1,12}$/;

const YOUTUBE_EMBED_BASE = "https://www.youtube.com/embed/";
const VIMEO_EMBED_BASE = "https://player.vimeo.com/video/";

function isCleanUrl(value: string): boolean {
  if (value.length === 0 || value.length > LEARNING_URL_MAX_LENGTH) {
    return false;
  }
  // No whitespace and no control characters: a URL that needs any of them is
  // not a link a user can paste from a browser address bar.
  if (/\s/.test(value)) return false;
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  return true;
}

function pathSegments(pathname: string): string[] {
  return pathname.split("/").filter((segment) => segment.length > 0);
}

function youtubeResult(videoId: string): NormalizedVideo | null {
  if (!YOUTUBE_ID_RE.test(videoId)) return null;
  return {
    provider: "youtube",
    videoId,
    embedUrl: `${YOUTUBE_EMBED_BASE}${videoId}`,
  };
}

function vimeoResult(videoId: string): NormalizedVideo | null {
  if (!VIMEO_ID_RE.test(videoId)) return null;
  return {
    provider: "vimeo",
    videoId,
    embedUrl: `${VIMEO_EMBED_BASE}${videoId}`,
  };
}

function normalizeYouTube(url: URL, host: string): NormalizedVideo | null {
  if (host === "youtu.be") {
    return youtubeResult(pathSegments(url.pathname)[0] ?? "");
  }

  const segments = pathSegments(url.pathname);
  const first = segments[0] ?? "";

  if (first === "watch") {
    return youtubeResult(url.searchParams.get("v") ?? "");
  }
  if (first === "embed" || first === "shorts" || first === "live") {
    return youtubeResult(segments[1] ?? "");
  }
  return null;
}

function normalizeVimeo(url: URL, host: string): NormalizedVideo | null {
  const segments = pathSegments(url.pathname);

  if (host === "player.vimeo.com") {
    return segments[0] === "video"
      ? vimeoResult(segments[1] ?? "")
      : null;
  }

  // vimeo.com/{id} only. Channels, groups and albums carry a slug we do not
  // resolve, so they are rejected instead of being guessed.
  if (segments.length !== 1) return null;
  return vimeoResult(segments[0] ?? "");
}

/**
 * Normalises a YouTube/Vimeo link into its canonical embed URL.
 *
 * Returns null when the value is not an https URL on an allowlisted host with a
 * well-formed video id. Callers translate null into a 400 response.
 */
export function normalizeVideoUrl(input: string): NormalizedVideo | null {
  const value = input.trim();
  if (!isCleanUrl(value)) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  // http is rejected rather than upgraded: the stored value must never depend
  // on a redirect the user cannot see.
  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com") {
    return normalizeYouTube(url, host);
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    return normalizeVimeo(url, host);
  }
  return null;
}

/** True when the value is already the canonical embed URL we would store. */
export function isCanonicalVideoEmbedUrl(value: string): boolean {
  const normalized = normalizeVideoUrl(value);
  return normalized !== null && normalized.embedUrl === value.trim();
}
