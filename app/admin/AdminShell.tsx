"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import styles from "./admin.module.css";

const LINKS = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/settings", label: "Настройки" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/referrals", label: "Рефералка" },
];

export function AdminShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d: { user?: { email?: string }; isAdmin?: boolean }) => {
        if (!d.user) {
          router.replace("/login?next=/admin");
          return;
        }
        if (!d.isAdmin) {
          setDenied(true);
          return;
        }
        setReady(true);
      })
      .catch(() => setDenied(true));
  }, [router]);

  if (denied) {
    return (
      <main className={styles.page}>
        <div className={styles.wrap}>
          <h1 className={styles.title}>Нет доступа</h1>
          <p className={styles.lead}>
            Ваш email не в ADMIN_EMAILS. Добавьте его в .env и перезайдите.
          </p>
          <Link href="/plan" className="btn">
            В кабинет
          </Link>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className={styles.page}>
        <div className={styles.wrap}>
          <p className={styles.lead}>Загрузка админки…</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <Link href="/admin" className={styles.logo}>
            <BrandLogo />
          </Link>
          <nav className={styles.nav} aria-label="Админка">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  pathname === l.href ? styles.navOn : undefined
                }
              >
                {l.label}
              </Link>
            ))}
            <Link href="/plan">Кабинет</Link>
          </nav>
          <ThemeToggle labels={{ light: "Светлая", dark: "Тёмная" }} />
        </div>
      </header>
      <div className={styles.wrap}>
        <h1 className={styles.title}>{title}</h1>
        {lead ? <p className={styles.lead}>{lead}</p> : null}
        {children}
      </div>
    </main>
  );
}
