import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "./sw-register";
import "./globals.css";

const geistSans = localFont({
  src: "../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
});

const icon192 = "/icons/icon-192.png";
const icon512 = "/icons/icon-512.png";
const appleTouchIcon = "/icons/apple-touch-icon.png";

export const metadata: Metadata = {
  title: "tea-posters | Spot the imposter. Spill the tea.",
  description: "A local pass-and-play imposter game for tea breaks.",
  applicationName: "tea-posters",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: icon192, type: "image/png", sizes: "192x192" },
      { url: icon512, type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: appleTouchIcon, type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#ff6500",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
