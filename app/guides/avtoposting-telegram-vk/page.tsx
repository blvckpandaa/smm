import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageShell } from "../../components/SeoPageShell";
import styles from "../guides.module.css";

export const metadata: Metadata = {
  title: "Автопостинг в Telegram и VK — ИИ-кабинет",
  description:
    "Автопостинг постов в Telegram и VK: недельный план, очередь публикаций и правки из одного кабинета SMM-Agents.",
  alternates: { canonical: "/guides/avtoposting-telegram-vk" },
  openGraph: {
    title: "Автопостинг в Telegram и VK — SMM-Agents",
    description:
      "План на неделю, тексты и публикация в Telegram и VK без ручной рутины.",
    url: "/guides/avtoposting-telegram-vk",
  },
};

const related = [
  { href: "/guides/bot-kommentariev-vk", label: "Бот ответов на комментарии VK" },
  { href: "/guides/ii-dlya-smm", label: "ИИ для SMM малого бизнеса" },
  { href: "/guides/kontent-plan", label: "Контент-план на неделю" },
];

export default function AvtopostingPage() {
  return (
    <SeoPageShell>
      <article className={`container ${styles.article}`}>
        <nav className={styles.crumb} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span>Автопостинг Telegram и VK</span>
        </nav>

        <header className={styles.hero}>
          <p className="eyebrow">Автопостинг</p>
          <h1>Автопостинг в Telegram и VK из одного кабинета</h1>
          <p className={styles.lead}>
            SMM-Agents собирает план на неделю, пишет тексты и ставит посты в
            очередь — вы проверяете и публикуете в Telegram и сообщество VK.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/register" className="btn">
              Создать аккаунт
            </Link>
            <Link href="/#price" className="btn btn-ghost">
              Смотреть цены
            </Link>
          </div>
        </header>

        <div className={styles.body}>
          <section>
            <h2>Зачем нужен автопостинг</h2>
            <p>
              Без расписания лента рвётся: сегодня три поста, потом тишина.
              Автопостинг держит ритм, пока вы заняты клиентами — особенно если
              ведёте и Telegram, и VK.
            </p>
            <p>
              В SMM-Agents очередь живёт в таблице постов: черновики, «в
              очереди», опубликованные и ошибки — с фильтрами по каналу и
              статусу.
            </p>
          </section>

          <section>
            <h2>Как это работает на smm-agents.ru</h2>
            <ol>
              <li>Описываете бизнес: ниша, тон, сайт, сколько постов в неделю.</li>
              <li>Агент собирает план и тексты под Telegram и VK.</li>
              <li>Подключаете каналы и ставите слоты в очередь или публикуете сразу.</li>
              <li>При необходимости переписываете текст или меняете фото с баланса.</li>
            </ol>
          </section>

          <section>
            <h2>Что уже работает</h2>
            <ul>
              <li>Публикация в Telegram и VK</li>
              <li>Разное время выхода в течение дня</li>
              <li>Правка поста перед отправкой</li>
              <li>Несколько бизнесов — отдельные проекты и каналы</li>
            </ul>
            <p>
              Facebook, Instagram, Threads и X пока в подготовке. Фокус сейчас —
              стабильный автопостинг туда, где уже идёт публикация.
            </p>
          </section>

          <section>
            <h2>Цены на контент</h2>
            <ul>
              <li>50 ₽ — пост в недельном плане</li>
              <li>25 ₽ — переписать текст или сгенерировать новое фото</li>
            </ul>
            <p>
              Баланс пополняется в кабинете. Отдельные подписки на ботов
              комментариев не обязательны для автопостинга.
            </p>
          </section>

          <section>
            <h2>Частые вопросы</h2>
            <div className={styles.faq}>
              <details>
                <summary>Нужен ли свой бот Telegram?</summary>
                <p>
                  Да, канал подключается через бота и chat id в разделе «Каналы»
                  кабинета. Инструкции показываются в интерфейсе.
                </p>
              </details>
              <details>
                <summary>Можно ли править пост после генерации?</summary>
                <p>
                  Да. Откройте пост в таблице, измените текст, время или медиа и
                  отправьте в очередь или опубликуйте сразу.
                </p>
              </details>
              <details>
                <summary>Подойдёт ли для нескольких брендов?</summary>
                <p>
                  Да. Каждый бизнес — отдельный проект со своими каналами,
                  планом и балансовыми списаниями.
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
          <h2>Запустите первую неделю автопостинга</h2>
          <p>
            Зарегистрируйтесь, добавьте бизнес и подключите Telegram или VK —
            дальше агент поможет с планом и очередью.
          </p>
          <Link href="/register" className="btn">
            Открыть кабинет
          </Link>
        </div>
      </article>
    </SeoPageShell>
  );
}
