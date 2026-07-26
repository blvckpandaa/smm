import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Админка — SMM-Agents",
  description: "Управление ценами, бонусами и рефералками",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
