import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageShell } from "../../components/SeoPageShell";
import styles from "../guides.module.css";

export const metadata: Metadata = {
  title: "ИИ для SMM — посты и ответы без отдела",
  description:
    "ИИ для SMM малого бизнеса: генерация постов, контент-план, правки и автоответы в комментариях Telegram и VK на smm-agents.ru.",
  alternates: { canonical: "/guides/ii-dlya-smm" },
  openGraph: {
    title: "ИИ для SMM — SMM-Agents",
    description:
      "Агент пишет посты, ведёт очередь и помогает отвечать в комментариях.",
    url: "/guides/ii-dlya-smm",
  },
};

const related = [
  { href: "/guides/kontent-plan", label: "Контент-план на неделю" },
  { href: "/guides/avtoposting-telegram-vk", label: "Автопостинг TG и VK" },
  { href: "/guides/bot-kommentariev-vk", label: "Бот комментариев VK" },
];

export default function IiDlyaSmmPage() {
  return (
    <SeoPageShell>
      <article className={`container ${styles.article}`}>
        <nav className={styles.crumb} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span>ИИ для SMM</span>
        </nav>

        <header className={styles.hero}>
          <p className="eyebrow">ИИ-агент</p>
          <h1>ИИ для SMM: контент и ответы без отдельного отдела</h1>
          <p className={styles.lead}>
            SMM-Agents — это не «чат с нейросетью», а кабинет: бриф бизнеса,
            недельный план, тексты, публикация и боты комментариев в одном месте.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/register" className="btn">
              Попробовать ИИ-агента
            </Link>
            <Link href="/#how" className="btn btn-ghost">
              Как это работает
            </Link>
          </div>
        </header>

        <div className={styles.body}>
          <section>
            <h2>Чем ИИ-агент отличается от ChatGPT</h2>
            <p>
              В чате вы каждый раз заново объясняете нишу и копируете текст в
              Telegram. В кабинете бриф сохраняется: тон, оффер, аудитория, сайт.
              Агент опирается на него при плане, текстах и ИИ-ответах в
              комментариях.
            </p>
            <p>
              Плюс очередь публикаций, статусы постов и отдельные тарифы на ботов
              — это операционка SMM, а не разовая генерация абзаца.
            </p>
          </section>

          <section>
            <h2>Что делает агент</h2>
            <ul>
              <li>Собирает контент-план на неделю под ваш ритм</li>
              <li>Пишет тексты постов под Telegram и VK</li>
              <li>Помогает с фото и переписывает черновики с баланса</li>
              <li>Отвечает в комментариях: FAQ или ИИ за 2&nbsp;₽</li>
            </ul>
          </section>

          <section>
            <h2>Для кого</h2>
            <ul>
              <li>Владельцы малого бизнеса без штатного SMM</li>
              <li>Эксперты и онлайн-школы с регулярной лентой</li>
              <li>Команды с несколькими брендами в одном аккаунте</li>
            </ul>
          </section>

          <section>
            <h2>Прозрачная оплата</h2>
            <ul>
              <li>50 ₽ — пост в плане</li>
              <li>25 ₽ — переписать текст или новое фото</li>
              <li>290 ₽ / 30 дней — бот комментариев VK или Telegram</li>
              <li>0 ₽ FAQ · 2 ₽ ответ ИИ</li>
            </ul>
          </section>

          <section>
            <h2>Частые вопросы</h2>
            <div className={styles.faq}>
              <details>
                <summary>Тексты нужно проверять?</summary>
                <p>
                  Да, рекомендуем. Агент ускоряет черновик, финальное слово —
                  за вами перед публикацией.
                </p>
              </details>
              <details>
                <summary>На каких языках можно вести контент?</summary>
                <p>
                  В брифе выбирается язык аудитории. Интерфейс кабинета — на
                  русском и английском.
                </p>
              </details>
              <details>
                <summary>Где хранятся проекты?</summary>
                <p>
                  В личном кабинете на smm-agents.ru. Раздел /plan закрыт от
                  индексации поисковиками.
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
          <h2>Соберите первую неделю с ИИ</h2>
          <p>
            Зарегистрируйтесь, заполните бриф и получите план постов под ваш
            бизнес.
          </p>
          <Link href="/register" className="btn">
            Создать аккаунт
          </Link>
        </div>
      </article>
    </SeoPageShell>
  );
}
