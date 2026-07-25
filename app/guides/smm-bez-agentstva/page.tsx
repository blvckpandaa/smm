import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageShell } from "../../components/SeoPageShell";
import styles from "../guides.module.css";

export const metadata: Metadata = {
  title: "SMM без агентства — посты и ответы дешевле",
  description:
    "SMM без агентства: контент-план, автопостинг и боты комментариев от 50 ₽ за пост. Кабинет SMM-Agents вместо штатного SMM.",
  alternates: { canonical: "/guides/smm-bez-agentstva" },
  openGraph: {
    title: "SMM без агентства — SMM-Agents",
    description:
      "Не платите за «просто вести соцсети». Платите за посты и ботов — прозрачно с баланса.",
    url: "/guides/smm-bez-agentstva",
  },
};

export default function SmmBezAgentstvaPage() {
  return (
    <SeoPageShell>
      <article className={`container ${styles.article}`}>
        <nav className={styles.crumb} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span>SMM без агентства</span>
        </nav>

        <header className={styles.hero}>
          <p className="eyebrow">Для собственников</p>
          <h1>SMM без агентства — и без дыры в бюджете</h1>
          <p className={styles.lead}>
            Агентство просит от десятков тысяч в месяц. Фрилансер пропадает.
            SMM-Agents даёт план, тексты, автопостинг и ответы в комментариях —
            вы платите за факты: посты и ботов.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/register" className="btn">
              Попробовать вместо агентства
            </Link>
            <Link href="/#price" className="btn btn-ghost">
              Открыть цены
            </Link>
          </div>
        </header>

        <div className={styles.body}>
          <section>
            <h2>Знакомо?</h2>
            <ul className={styles.hooks}>
              <li>
                «Ведение соцсетей» — 40–80 тыс. ₽, а постов всё равно мало
                <span>Вы платите за процесс, а не за результат в ленте</span>
              </li>
              <li>
                Неделю ждёте контент-план в переписке
                <span>В кабинете план собирается под ваш бриф</span>
              </li>
              <li>
                Комментарии висят без ответа, пока SMM «на другом проекте»
                <span>Бот FAQ или ИИ отвечает, пока вы с клиентами</span>
              </li>
            </ul>
          </section>

          <section>
            <h2>Что получаете в SMM-Agents</h2>
            <ul>
              <li>Недельный план и тексты под Telegram и VK</li>
              <li>Очередь публикаций и правки до выхода</li>
              <li>Боты комментариев — отдельно, когда нужны</li>
              <li>Несколько бизнесов в одном аккаунте</li>
            </ul>
            <div className={styles.savings}>
              <strong>Ориентир по деньгам</strong>
              <p>
                50 ₽ пост · 25 ₽ переписать · 290 ₽ бот на 30 дней. Без «пакета
                на всё сразу», если вам нужен только контент.
              </p>
            </div>
          </section>

          <section>
            <h2>Когда агентство всё же нужно</h2>
            <p>
              Крупный бренд, сложная стратегия, съёмки и инфлюенсеры — это другая
              задача. Если цель — стабильная лента и ответы в TG/VK без штата,
              начните с кабинета на smm-agents.ru.
            </p>
          </section>

          <section>
            <h2>Частые сомнения</h2>
            <div className={styles.faq}>
              <details>
                <summary>Тексты будут «как у нейросети»?</summary>
                <p>
                  Черновик опирается на ваш бриф: ниша, тон, оффер. Вы правите
                  перед публикацией — финальное слово за вами.
                </p>
              </details>
              <details>
                <summary>Можно ли вести несколько точек?</summary>
                <p>
                  Да. Кафе, вторая студия, личный блог эксперта — отдельные
                  проекты со своими каналами.
                </p>
              </details>
            </div>
          </section>
        </div>

        <aside className={styles.related}>
          <h2>Ещё по теме</h2>
          <ul className={styles.relatedList}>
            <li>
              <Link href="/guides/ne-uspevayu-vesti-socseti">
                Не успеваю вести соцсети
              </Link>
            </li>
            <li>
              <Link href="/guides/avtoposting-telegram-vk">Автопостинг TG и VK</Link>
            </li>
            <li>
              <Link href="/guides/ii-dlya-smm">ИИ для SMM</Link>
            </li>
          </ul>
        </aside>

        <div className={styles.final}>
          <h2>Соберите неделю контента сегодня</h2>
          <p>
            Регистрация занимает минуты. Добавьте бизнес — и увидите кабинет с
            постами, каналами и ботами.
          </p>
          <Link href="/register" className="btn">
            Создать аккаунт бесплатно
          </Link>
        </div>
      </article>
    </SeoPageShell>
  );
}
