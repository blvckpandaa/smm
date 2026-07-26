"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { BrandLogo } from "./BrandLogo";
import home from "../page.module.css";
import styles from "../guides/guides.module.css";

type Props = {
  children: React.ReactNode;
};

export function SeoPageShell({ children }: Props) {
  return (
    <main>
      <header className={home.nav}>
        <div className={`container ${home.navInner}`}>
          <Link href="/" className={home.logo}>
            <BrandLogo />
          </Link>
          <nav className={home.navLinks} aria-label="Разделы">
            <Link href="/guides/smm-bez-agentstva">Без агентства</Link>
            <Link href="/guides/ne-uspevayu-vesti-socseti">Нет времени</Link>
            <Link href="/guides">Все гайды</Link>
            <Link href="/#price">Цены</Link>
          </nav>
          <div className={home.headerActions}>
            <ThemeToggle />
            <Link href="/register" className="btn">
              Начать
            </Link>
          </div>
        </div>
      </header>

      {children}

      <footer className={home.footer}>
        <div className={`container ${home.footerInner}`}>
          <Link href="/" className={home.logo}>
            <BrandLogo size={24} />
          </Link>
          <nav className={styles.footerNav} aria-label="Полезные страницы">
            <Link href="/guides/smm-bez-agentstva">Без агентства</Link>
            <Link href="/guides/posts-dlya-kafe">Для кафе</Link>
            <Link href="/guides/kontent-dlya-eksperta">Для экспертов</Link>
            <Link href="/guides/psiholog-v-socsetyah">Для психологов</Link>
            <Link href="/guides">Все гайды</Link>
            <Link href="/login">Вход</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
