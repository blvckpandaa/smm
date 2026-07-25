import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Подключения",
  robots: { index: false, follow: false, nocache: true },
};

export default function ConnectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
