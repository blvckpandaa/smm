import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageShell } from "../../components/SeoPageShell";
import styles from "../guides.module.css";

export const metadata: Metadata = {
  title: "Посты для кафе, салона и услуг — без SMM-отдела",
  description:
    "Посты для кафе, салона красоты, клиники и локальных услуг: контент-план, автопостинг Telegram и VK, ответы в комментариях.",
  alternates: { canonical: "/guides/posts-dlya-kafe" },
  openGraph: {
    title: "Посты для кафе и услуг — SMM-Agents",
    description:
      "Лента, которая работает, пока вы на смене: план, публикация, автоответы.",
    url: "/guides/posts-dlya-kafe",
  },
};

export default function PostsDlyaKafePage() {
  return (
    <SeoPageShell>
      <article className={`container ${styles.article}`}>
        <nav className={styles.crumb} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span>Посты для кафе и услуг</span>
        </nav>

        <header className={styles.hero}>
          <p className="eyebrow">Локальный бизнес</p>
          <h1>Посты для кафе, салона и услуг — без отдельного SMM</h1>
          <p className={styles.lead}>
            Гости спрашивают «работаете завтра?» в комментариях, а лента молчит
            неделями. SMM-Agents держит Telegram и VK в ритме: меню, акции,
            атмосфера и ответы на частые вопросы.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/register" className="btn">
              Запустить ленту заведения
            </Link>
            <Link href="/guides/bot-kommentariev-vk" className="btn btn-ghost">
              Автоответы в VK
            </Link>
          </div>
        </header>

        <div className={styles.body}>
          <section>
            <h2>Что публиковать, когда нет идей</h2>
            <ul className={styles.hooks}>
              <li>
                Блюдо дня, окно записи, «успейте до…»
                <span>План смешивает пользу, акции и живое общение</span>
              </li>
              <li>
                Одинаковые вопросы про парковку, цену, график
                <span>Сложите FAQ — бот ответит без вас</span>
              </li>
              <li>
                Две сети сразу: Telegram-канал и сообщество VK
                <span>Один кабинет, свои слоты на каждый канал</span>
              </li>
            </ul>
          </section>

          <section>
            <h2>Подходит не только кафе</h2>
            <ul>
              <li>Салоны красоты и барбершопы</li>
              <li>Стоматологии и клиники</li>
              <li>Студии йоги, детские центры, автосервисы</li>
              <li>Любые услуги «рядом с домом», где важна регулярность</li>
            </ul>
            <div className={styles.savings}>
              <strong>Начните с малого</strong>
              <p>
                Например 5–7 постов в неделю по 50 ₽ — уже живая лента. Бота
                комментариев подключите, когда наберёте трафик.
              </p>
            </div>
          </section>

          <section>
            <h2>Частые вопросы</h2>
            <div className={styles.faq}>
              <details>
                <summary>Нужны свои фото блюд?</summary>
                <p>
                  Свои фото сильнее. Можно публиковать текст без медиа или
                  сгенерировать изображение в кабинете за 25&nbsp;₽.
                </p>
              </details>
              <details>
                <summary>Несколько филиалов?</summary>
                <p>
                  Сделайте отдельный проект на точку или ведите общий бренд —
                  как удобнее вам и аудитории.
                </p>
              </details>
            </div>
          </section>
        </div>

        <aside className={styles.related}>
          <h2>Ещё по теме</h2>
          <ul className={styles.relatedList}>
            <li>
              <Link href="/guides/kontent-dlya-eksperta">Контент для эксперта</Link>
            </li>
            <li>
              <Link href="/guides/ne-uspevayu-vesti-socseti">
                Не успеваю вести соцсети
              </Link>
            </li>
            <li>
              <Link href="/guides/avtoposting-telegram-vk">Автопостинг</Link>
            </li>
          </ul>
        </aside>

        <div className={styles.final}>
          <h2>Пусть лента работает на смене</h2>
          <p>
            Опишите заведение в брифе — агент предложит неделю постов под ваших
            гостей.
          </p>
          <Link href="/register" className="btn">
            Создать проект заведения
          </Link>
        </div>
      </article>
    </SeoPageShell>
  );
}
