import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Кабинет",
  description: "Личный кабинет SMM-Agents",
  robots: { index: false, follow: false, nocache: true },
};

export default function PlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
