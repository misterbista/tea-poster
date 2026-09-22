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

const logoIcon = "/ChatGPT%20Image%20Sep%2022%2C%202026%20at%2011_38_07%20AM.png?v=3";

export const metadata: Metadata = {
  title: "tea-posters | Spot the imposter. Spill the tea.",
  description: "A pass-and-play imposter game for tea breaks, online or offline.",
  applicationName: "tea-posters",
  icons: {
    icon: [{ url: logoIcon, type: "image/png", sizes: "1254x1254" }],
    apple: [{ url: logoIcon, type: "image/png", sizes: "1254x1254" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f1e7",
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
