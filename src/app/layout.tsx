import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/lib/analytics/posthog";
import { SentryInit } from "@/components/monitoring/SentryInit";
import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Relationship Intelligence`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Relationship Intelligence`,
    description:
      "Assess relationship compatibility through a structured, AI-powered assessment. Built for marriage-minded adults who want clarity before commitment.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "SolidGround AI — Compatibility Blueprint™",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Relationship Intelligence`,
    description:
      "Assess relationship compatibility through a structured, AI-powered assessment. Built for marriage-minded adults who want clarity before commitment.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased"><a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow-lg">Skip to main content</a><PostHogProvider><SentryInit />{children}</PostHogProvider></body>
    </html>
  );
}
