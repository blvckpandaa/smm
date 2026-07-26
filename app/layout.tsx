import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Syne, Manrope } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["600", "700", "800"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const YANDEX_METRIKA_ID = 110895546;
const SITE_URL = "https://smm-agents.ru";
const SITE_NAME = "SMM-Agents";
const SITE_DESC =
  "ИИ-кабинет для Telegram и VK: план постов, автопубликация и боты комментариев (FAQ или ИИ). Экономия времени на SMM.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SMM-Agents — посты, расписание и боты комментариев",
    template: "%s · SMM-Agents",
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "SMM",
    "ИИ для SMM",
    "автопостинг",
    "Telegram бот",
    "VK бот",
    "контент план",
    "автоответы на комментарии",
    "SMM-Agents",
    "генерация постов",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "SMM-Agents — посты, расписание и боты комментариев",
    description: SITE_DESC,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "SMM-Agents — ИИ-кабинет для Telegram и VK",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SMM-Agents — посты, расписание и боты комментариев",
    description: SITE_DESC,
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
      "max-video-preview": -1,
    },
  },
  icons: {
    // Stable icons for Google/Yandex SERP (48x48+) — no media/query switching
    icon: [
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        url: "/favicon/light/32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon/dark/32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [{ url: "/favicon/light/180.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "msapplication-TileImage": "/icon-192.png",
  },
  manifest: "/site.webmanifest",
  category: "technology",
  verification: {
    google: "66Y9djFNb4_E9tKIcl4UACgLMmFp1Yqa-B4VGkBcm1I",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8eef2" },
    { media: "(prefers-color-scheme: dark)", color: "#12161a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${syne.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body
        style={
          {
            "--font-display": "var(--font-syne), sans-serif",
            "--font-body": "var(--font-manrope), sans-serif",
          } as React.CSSProperties
        }
      >
        <Script id="theme-boot" strategy="beforeInteractive">
          {THEME_BOOT_SCRIPT}
        </Script>
        {children}
        <Script id="yandex-metrika" strategy="afterInteractive">{`
(function(m,e,t,r,i,k,a){
  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}', 'ym');
ym(${YANDEX_METRIKA_ID}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", accurateTrackBounce:true, trackLinks:true});
        `}</Script>
        <noscript>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`}
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
      </body>
    </html>
  );
}
