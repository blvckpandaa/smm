import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageShell } from "../../components/SeoPageShell";
import styles from "../guides.module.css";

export const metadata: Metadata = {
  title: "Не успеваю вести соцсети — ИИ-агент поможет",
  description:
    "Не успеваете вести Telegram и VK? SMM-Agents пишет посты, ставит в очередь и отвечает в комментариях, пока вы работаете с клиентами.",
  alternates: { canonical: "/guides/ne-uspevayu-vesti-socseti" },
  openGraph: {
    title: "Не успеваю вести соцсети — SMM-Agents",
    description:
      "Верните вечера себе: план на неделю, автопостинг и боты комментариев.",
    url: "/guides/ne-uspevayu-vesti-socseti",
  },
};

export default function NeUspevayuPage() {
  return (
    <SeoPageShell>
      <article className={`container ${styles.article}`}>
        <nav className={styles.crumb} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span>Не успеваю вести соцсети</span>
        </nav>

        <header className={styles.hero}>
          <p className="eyebrow">Если времени ноль</p>
          <h1>Не успеваете вести соцсети? Так и задумано — делегируйте агенту</h1>
          <p className={styles.lead}>
            Клиенты, закупки, смена — а вечером ещё «надо что-то написать в
            Telegram». SMM-Agents забирает рутину: план, тексты, очередь и
            ответы в комментариях.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/register" className="btn">
              Делегировать ленту агенту
            </Link>
            <Link href="/guides/kontent-plan" className="btn btn-ghost">
              Как выглядит план
            </Link>
          </div>
        </header>

        <div className={styles.body}>
          <section>
            <h2>Что съедает время</h2>
            <ul className={styles.hooks}>
              <li>
                Придумать тему с нуля каждый раз
                <span>Агент предлагает неделю тем под ваш бриф</span>
              </li>
              <li>
                Копировать текст из чата в бота вручную
                <span>Очередь публикаций в кабинете — один клик</span>
              </li>
              <li>
                Отвечать на одни и те же комментарии
                <span>FAQ бесплатно, ИИ — 2 ₽ за ответ</span>
              </li>
            </ul>
          </section>

          <section>
            <h2>Минимум вашего участия</h2>
            <ol>
              <li>Один раз заполняете бриф бизнеса.</li>
              <li>Смотрите план и правите, что режет глаз.</li>
              <li>Подключаете каналы и включаете очередь.</li>
              <li>По желанию — бот комментариев на 30 дней.</li>
            </ol>
            <div className={styles.savings}>
              <strong>Цель — тихая лента</strong>
              <p>
                Не идеальный маркетинговый отдел. Стабильные посты и ответы, пока
                вы зарабатываете на основной работе.
              </p>
            </div>
          </section>

          <section>
            <h2>Частые вопросы</h2>
            <div className={styles.faq}>
              <details>
                <summary>Нужно заходить каждый день?</summary>
                <p>
                  Нет. Удобно раз в несколько дней проверить очередь и ошибки.
                  Публикации идут по расписанию.
                </p>
              </details>
              <details>
                <summary>Я совсем не умею в SMM</summary>
                <p>
                  Бриф на простом языке: кто клиент, что продаёте, какой тон.
                  Остальное — в подсказках кабинета.
                </p>
              </details>
            </div>
          </section>
        </div>

        <aside className={styles.related}>
          <h2>Ещё по теме</h2>
          <ul className={styles.relatedList}>
            <li>
              <Link href="/guides/smm-bez-agentstva">SMM без агентства</Link>
            </li>
            <li>
              <Link href="/guides/posts-dlya-kafe">Посты для кафе и услуг</Link>
            </li>
            <li>
              <Link href="/guides/bot-kommentariev-vk">Бот комментариев VK</Link>
            </li>
          </ul>
        </aside>

        <div className={styles.final}>
          <h2>Верните себе вечер</h2>
          <p>
            Создайте аккаунт, добавьте бизнес за 5 минут — первую неделю можно
            собрать сразу.
          </p>
          <Link href="/register" className="btn">
            Начать в кабинете
          </Link>
        </div>
      </article>
    </SeoPageShell>
  );
}
