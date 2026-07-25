import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageShell } from "../components/SeoPageShell";
import styles from "./guides.module.css";

export const metadata: Metadata = {
  title: "Гайды и предложения SMM-Agents",
  description:
    "Автопостинг, боты, ИИ для SMM и страницы для кафе, экспертов и психологов — всё о кабинете SMM-Agents.",
  alternates: { canonical: "/guides" },
};

const how = [
  {
    href: "/guides/avtoposting-telegram-vk",
    title: "Автопостинг в Telegram и VK",
    text: "План, очередь и публикация из одного кабинета.",
  },
  {
    href: "/guides/bot-kommentariev-vk",
    title: "Бот комментариев VK",
    text: "FAQ бесплатно, ИИ-ответы по брифу.",
  },
  {
    href: "/guides/ii-dlya-smm",
    title: "ИИ для SMM",
    text: "Кабинет, а не разовый чат с нейросетью.",
  },
  {
    href: "/guides/kontent-plan",
    title: "Контент-план на неделю",
    text: "Темы и слоты без пустой таблицы.",
  },
];

const sell = [
  {
    href: "/guides/smm-bez-agentstva",
    title: "SMM без агентства",
    text: "Прозрачные цены вместо «ведения за 50 тысяч».",
  },
  {
    href: "/guides/ne-uspevayu-vesti-socseti",
    title: "Не успеваю вести соцсети",
    text: "Делегируйте ленту, верните себе вечер.",
  },
  {
    href: "/guides/posts-dlya-kafe",
    title: "Посты для кафе и услуг",
    text: "Локальный бизнес: смена, гости, Telegram и VK.",
  },
  {
    href: "/guides/kontent-dlya-eksperta",
    title: "Контент для эксперта",
    text: "Регулярная экспертность без выгорания на текстах.",
  },
  {
    href: "/guides/psiholog-v-socsetyah",
    title: "Психолог в соцсетях",
    text: "Тёплый блог и аккуратные автоответы.",
  },
];

export default function GuidesIndexPage() {
  return (
    <SeoPageShell>
      <article className={`container ${styles.article}`}>
        <header className={styles.hero}>
          <p className="eyebrow">База знаний</p>
          <h1>Гайды и предложения SMM-Agents</h1>
          <p className={styles.lead}>
            Как работает кабинет — и страницы под вашу ситуацию: нет времени,
            дорого агентство, кафе, эксперт или психолог.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/register" className="btn">
              Открыть кабинет
            </Link>
          </div>
        </header>

        <div className={styles.guideGroups}>
          <section>
            <h2>Ваша ситуация</h2>
            <ul className={styles.relatedList}>
              {sell.map((g) => (
                <li key={g.href}>
                  <Link href={g.href}>{g.title}</Link>
                  <p className={styles.lead} style={{ marginTop: "0.35rem" }}>
                    {g.text}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Как это устроено</h2>
            <ul className={styles.relatedList}>
              {how.map((g) => (
                <li key={g.href}>
                  <Link href={g.href}>{g.title}</Link>
                  <p className={styles.lead} style={{ marginTop: "0.35rem" }}>
                    {g.text}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </article>
    </SeoPageShell>
  );
}
