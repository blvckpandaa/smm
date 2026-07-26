import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Кошелёк — пополнение",
  description:
    "Пополнение баланса SMM-Agents: карта, СБП, BTC, USDT, TON, Trust Wallet и TON Wallet",
  robots: { index: false, follow: false, nocache: true },
};

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
