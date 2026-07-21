import type { Metadata } from "next";
import { Syne, Manrope } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["600", "700", "800"],
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SMM-Agents — ИИ-агент для постов в соцсетях",
  description:
    "Опишите бизнес — получите план и тексты для соцсетей. smm-agents.ru",
  metadataBase: new URL("https://smm-agents.ru"),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${syne.variable} ${manrope.variable}`}>
      <body
        style={
          {
            "--font-display": "var(--font-syne), sans-serif",
            "--font-body": "var(--font-manrope), sans-serif",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
