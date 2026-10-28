import type { NextConfig } from "next";

// Baseline HTTP security headers (Security Hardening V1).
//
// Declared here instead of a middleware file: `headers()` is the supported
// global mechanism and covers every surface — landing pages, dashboard pages,
// API routes and static assets — without adding a request-time hop.
//
// Deliberately NOT included:
//   - Content-Security-Policy, because the landing renders Blob-hosted remote
//     images and several inline style/script shapes that need their own review;
//   - CORS, because no cross-origin API consumer exists.
const SECURITY_HEADERS = [
  // Never let a browser re-interpret a declared content type (JSON, HTML, PDF).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin only on cross-origin hops; never the full internal URL.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No WIBEX page may be framed anywhere (clickjacking / UI redress).
  { key: "X-Frame-Options", value: "DENY" },
  // No surface needs device sensors, capture devices, location or payments.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
