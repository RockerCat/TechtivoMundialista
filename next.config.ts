import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
};

const isProd = process.env.NODE_ENV === "production";

// @ducanh2912/next-pwa always attaches a `webpack` config function (even
// when `disable: true`), which conflicts with Turbopack-based `next dev`.
// Only wrap with the PWA plugin for production builds — dev runs the plain
// config untouched, so the service worker is effectively dev-disabled.
export default isProd
  ? withPWA({
      dest: "public",
      register: true,
      // Disabled: was populating orphan caches (pages, next-static-js-assets,
      // static-js-assets) that grew indefinitely and were never read back by
      // Workbox routes. Every client-side nav triggered a full HTML + asset
      // pre-cache that survived across deploys with no expiration.
      cacheOnFrontEndNav: false,
      workboxOptions: {
        skipWaiting: true,
        // Rule order matters: Workbox applies the first matching route.
        // _next/static must come before the generic *.js|css pattern so that
        // Next.js hashed chunks get CacheFirst (immutable URLs) rather than
        // StaleWhileRevalidate, which could serve stale JS after a deploy.
        runtimeCaching: [
          {
            // Next.js content-hashed static assets are immutable — safe to
            // serve from cache indefinitely. Covers chunks, CSS, media.
            urlPattern: /^https?.*\/_next\/static\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "next-static",
              expiration: { maxEntries: 256, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https?.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-images",
              expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            // Third-party JS/CSS not under _next/static (e.g. analytics snippets)
            urlPattern: /^https?.*\.(?:js|css)$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "static-resources" },
          },
        ],
      },
    })(nextConfig)
  : nextConfig;
