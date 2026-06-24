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
      cacheOnFrontEndNav: true,
      workboxOptions: {
        skipWaiting: true,
        // App shell + static assets only — no API/data caching, no offline writes.
        runtimeCaching: [
          {
            urlPattern: /^https?.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-images",
              expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https?.*\.(?:js|css)$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "static-resources" },
          },
          {
            urlPattern: /^https?.*\/_next\/static\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "next-static",
              expiration: { maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    })(nextConfig)
  : nextConfig;
