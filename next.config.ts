import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  // Lets a phone on the same Wi-Fi use the dev server at this Mac's address
  // (http://192.168.0.219:3000). Hostnames only, no scheme or port. Update it
  // if the router gives this Mac a new address.
  allowedDevOrigins: ["192.168.0.219"],
  // The client cache is off for dynamic routes by default (staleTimes.dynamic
  // is 0s), so going back re-ran every query. 30s covers back/forward and tab
  // switching without showing meaningfully stale orders.
  experimental: {
    staleTimes: { dynamic: 30, static: 300 },
    // In development Next replays server-side fetch responses across hot
    // reloads, and that includes Supabase's signing calls: after a few edits
    // the page kept handing out a signed URL that had already expired, and
    // every image broke until a restart. Signatures must always be fresh.
    serverComponentsHmrCache: false,
  },
  devIndicators: false,
  // Room scenes the mockups are drawn on, read from disk by the routes that
  // draw them (lib/mockups/get-mockup.ts).
  outputFileTracingIncludes: {
    "/api/mockups": ["./lib/mockups/scenes/**/*"],
    "/api/checkout": ["./lib/mockups/scenes/**/*"],
    "/api/creator/orders/**": ["./lib/mockups/scenes/**/*"],
    "/checkout/success": ["./lib/mockups/scenes/**/*"],
  },
  // There is no landing page in the app: the marketing site is built elsewhere.
  // Temporary, so pointing "/" at a real page later needs no cache busting.
  async redirects() {
    return [
      { source: "/", destination: "/auth/login", permanent: false },
      // Moved under the store it shapes; keeps old bookmarks working.
      {
        source: "/dashboard/reference-images",
        destination: "/dashboard/store/reference-images",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Same-origin only: the dashboard frames the storefront as a
          // preview, and no other site may frame any page.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
