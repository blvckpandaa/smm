import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageShell } from "../../components/SeoPageShell";
import styles from "../guides.module.css";

export const metadata: Metadata = {
  title: "Бот комментариев VK — FAQ и ИИ-ответы",
  description:
    "Бот ответов на комментарии во VK: FAQ бесплатно, ИИ-ответы по брифу за 2 ₽. Подключение на 30 дней в SMM-Agents.",
  alternates: { canonical: "/guides/bot-kommentariev-vk" },
  openGraph: {
    title: "Бот комментариев VK — SMM-Agents",
    description:
      "Автоответы в комментариях сообщества VK: база FAQ или короткие ответы ИИ.",
    url: "/guides/bot-kommentariev-vk",
  },
};

const related = [
  { href: "/guides/avtoposting-telegram-vk", label: "Автопостинг Telegram и VK" },
  { href: "/guides/ii-dlya-smm", label: "ИИ для SMM" },
  { href: "/guides/kontent-plan", label: "Контент-план на неделю" },
];

export default function BotKommentarievPage() {
  return (
    <SeoPageShell>
      <article className={`container ${styles.article}`}>
        <nav className={styles.crumb} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span>Бот комментариев VK</span>
        </nav>

        <header className={styles.hero}>
          <p className="eyebrow">Боты комментариев</p>
          <h1>Бот ответов на комментарии во VK</h1>
          <p className={styles.lead}>
            Не оставляйте вопросы под постами без ответа. В SMM-Agents бот
            работает в сообществе VK: быстрые ответы из FAQ или короткий ИИ-ответ
            по вашему брифу.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/register" className="btn">
              Подключить бота
            </Link>
            <Link href="/guides/avtoposting-telegram-vk" className="btn btn-ghost">
              Про автопостинг
            </Link>
          </div>
        </header>

        <div className={styles.body}>
          <section>
            <h2>Два режима ответа</h2>
            <ul>
              <li>
                <strong>FAQ</strong> — ответы из вашей базы, без списания за
                каждое сообщение (0 ₽ за ответ).
              </li>
              <li>
                <strong>ИИ</strong> — короткий ответ с учётом брифа бизнеса,
                2&nbsp;₽ за ответ.
              </li>
            </ul>
            <p>
              Бот VK — отдельный тариф: 290&nbsp;₽ за 30 дней. Telegram-бот
              комментариев подключается так же, своим периодом.
            </p>
          </section>

          <section>
            <h2>Как подключить Callback VK</h2>
            <ol>
              <li>Подключите сообщество VK в разделе «Каналы».</li>
              <li>Активируйте бота на вкладке «Боты» в кабинете.</li>
              <li>
                Укажите Callback URL:{" "}
                <code>https://smm-agents.ru/api/vk/comments/webhook</code>
              </li>
              <li>
                Нажмите «Синхронизировать Callback» — сервис сам подставит код
                подтверждения от VK.
              </li>
            </ol>
            <p>
              Важно: URL должен быть на вашем рабочем домене smm-agents.ru, не
              localhost. Иначе VK не доставит события.
            </p>
          </section>

          <section>
            <h2>Кому полезно</h2>
            <ul>
              <li>Салоны, клиники, кафе — одни и те же вопросы про запись и цены</li>
              <li>Эксперты и курсы — уточнения по продукту в комментариях</li>
              <li>Магазины — наличие, доставка, акции</li>
            </ul>
          </section>

          <section>
            <h2>Частые вопросы</h2>
            <div className={styles.faq}>
              <details>
                <summary>Бот отвечает на все комментарии?</summary>
                <p>
                  Логика зависит от настроек и режима. В FAQ бот ищет совпадение
                  в базе; в режиме ИИ формирует краткий ответ по контексту
                  бренда. Служебные и пустые сообщения можно отфильтровать.
                </p>
              </details>
              <details>
                <summary>Нужен ли автопостинг, чтобы пользоваться ботом?</summary>
                <p>
                  Нет. Бот комментариев — отдельная услуга. Но удобнее вести посты
                  и ответы в одном кабинете.
                </p>
              </details>
              <details>
                <summary>Что если Callback не подтверждается?</summary>
                <p>
                  Проверьте точный URL webhook, что группа подключена в проекте,
                  и нажмите синхронизацию в кабинете. Код подтверждения выдаёт
                  VK — вручную его придумывать не нужно.
                </p>
              </details>
            </div>
          </section>
        </div>

        <aside className={styles.related}>
          <h2>Читайте также</h2>
          <ul className={styles.relatedList}>
            {related.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.final}>
          <h2>Включите ответы в комментариях</h2>
          <p>
            Создайте аккаунт, подключите VK и активируйте бота на 30 дней —
            FAQ можно запустить сразу.
          </p>
          <Link href="/register" className="btn">
            Открыть кабинет
          </Link>
        </div>
      </article>
    </SeoPageShell>
  );
}
