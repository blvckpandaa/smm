import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageShell } from "../../components/SeoPageShell";
import styles from "../guides.module.css";

export const metadata: Metadata = {
  title: "Психолог в соцсетях — посты и ответы бережно",
  description:
    "Психолог в Telegram и VK: регулярные посты, доверие аудитории и аккуратные автоответы на частые вопросы. Кабинет SMM-Agents.",
  alternates: { canonical: "/guides/psiholog-v-socsetyah" },
  openGraph: {
    title: "Психолог в соцсетях — SMM-Agents",
    description:
      "Держите контакт с аудиторией без выгорания на ежедневных текстах.",
    url: "/guides/psiholog-v-socsetyah",
  },
};

export default function PsihologPage() {
  return (
    <SeoPageShell>
      <article className={`container ${styles.article}`}>
        <nav className={styles.crumb} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span>Психолог в соцсетях</span>
        </nav>

        <header className={styles.hero}>
          <p className="eyebrow">Для психологов</p>
          <h1>Психолог в соцсетях: тепло в ленте без выгорания</h1>
          <p className={styles.lead}>
            Клиенты находят вас в Telegram и VK. Между сессиями сложно ещё и
            писать посты. SMM-Agents помогает с планом и черновиками — а границы
            и этику вы задаёте в брифе и правках.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/register" className="btn">
              Вести блог психолога
            </Link>
            <Link href="/guides/kontent-dlya-eksperta" className="btn btn-ghost">
              Для экспертов в целом
            </Link>
          </div>
        </header>

        <div className={styles.body}>
          <section>
            <h2>Что обычно тормозит</h2>
            <ul className={styles.hooks}>
              <li>
                Страх «продать» слишком прямолинейно
                <span>В плане есть место пользе и доверию, не только офферу</span>
              </li>
              <li>
                Одинаковые вопросы в комментариях про формат и цену
                <span>FAQ отвечает шаблоном, который вы утвердили</span>
              </li>
              <li>
                Хочется живой тон, а писать сил нет
                <span>Черновик за минуты — вы оставляете свою интонацию</span>
              </li>
            </ul>
          </section>

          <section>
            <h2>Важно про автоответы</h2>
            <p>
              Бот не заменяет консультацию и не ставит диагнозы. Используйте FAQ
              для организационных вопросов: формат, запись, стоимость, ссылка на
              сайт. ИИ-ответы проверяйте настройками и лимитами — чувствительные
              темы лучше оставлять себе.
            </p>
            <div className={styles.savings}>
              <strong>Вы задаёте рамку</strong>
              <p>
                Бриф, база FAQ и ручная правка постов — контроль остаётся у
                специалиста.
              </p>
            </div>
          </section>

          <section>
            <h2>Как начать</h2>
            <ol>
              <li>Создайте проект и опишите подход / аудиторию.</li>
              <li>Соберите неделю мягкого экспертного контента.</li>
              <li>Подключите Telegram или VK.</li>
              <li>Добавьте FAQ для организационных комментариев.</li>
            </ol>
          </section>

          <section>
            <h2>Частые вопросы</h2>
            <div className={styles.faq}>
              <details>
                <summary>Можно ли вести блог вдвоём (пара специалистов)?</summary>
                <p>
                  Да. Укажите в брифе общий тон или заведите два проекта, если
                  позиционирование разное.
                </p>
              </details>
              <details>
                <summary>Сколько это примерно стоит?</summary>
                <p>
                  Пост в плане — 50&nbsp;₽. Бот комментариев — 290&nbsp;₽ / 30
                  дней. FAQ-ответы без доплаты за штуку.
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
              <Link href="/guides/bot-kommentariev-vk">Бот комментариев VK</Link>
            </li>
            <li>
              <Link href="/guides/ne-uspevayu-vesti-socseti">
                Не успеваю вести соцсети
              </Link>
            </li>
          </ul>
        </aside>

        <div className={styles.final}>
          <h2>Пусть блог работает между сессиями</h2>
          <p>
            Зарегистрируйтесь и соберите первую неделю — без ощущения, что снова
            «надо что-то придумать с нуля».
          </p>
          <Link href="/register" className="btn">
            Открыть кабинет
          </Link>
        </div>
      </article>
    </SeoPageShell>
  );
}
