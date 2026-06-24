import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://techtivo-Pollita.vercel.app"),

  title: "Techtivo Pollita - Polla Pollita Interna",
  description:
    "Predice, compite y pelea por la bolsa del Mundial.",
  keywords: [
    "polla Pollita",
    "predicciones",
    "fútbol",
    "mundial 2026",
    "grupos privados"
  ],

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pollita",
  },

  icons: {
    apple: "/apple-touch-icon-v2.png",
  },

  openGraph: {
    title: "Techtivo Pollita - Polla Pollita Interna",
    description:
      "Predice, compite y pelea por la bolsa del Mundial.",
    type: "website",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },

  twitter: {
    card: "summary_large_image",
    title: "Techtivo Pollita - Polla Pollita Interna",
    description:
      "Predice, compite y pelea por la bolsa del Mundial.",
    images: ["/opengraph-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-dvh bg-[#0a0a12] text-[#f1f5f9] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
