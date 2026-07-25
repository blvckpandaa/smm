import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Регистрация",
  description:
    "Создайте аккаунт SMM-Agents и начните генерировать посты для Telegram и VK.",
  alternates: { canonical: "/register" },
  openGraph: {
    title: "Регистрация · SMM-Agents",
    description:
      "Создайте аккаунт и запустите ИИ-кабинет для постов и ботов комментариев.",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
