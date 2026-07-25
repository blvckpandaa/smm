import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageShell } from "../../components/SeoPageShell";
import styles from "../guides.module.css";

export const metadata: Metadata = {
  title: "Контент для эксперта и онлайн-курсов",
  description:
    "Контент для эксперта, коуча и онлайн-школы: полезные посты, доверие, автопостинг и ответы на вопросы в комментариях.",
  alternates: { canonical: "/guides/kontent-dlya-eksperta" },
  openGraph: {
    title: "Контент для эксперта — SMM-Agents",
    description:
      "Регулярная экспертность в Telegram и VK без выгорания на текстах.",
    url: "/guides/kontent-dlya-eksperta",
  },
};

export default function KontentDlyaEkspertaPage() {
  return (
    <SeoPageShell>
      <article className={`container ${styles.article}`}>
        <nav className={styles.crumb} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span>Контент для эксперта</span>
        </nav>

        <header className={styles.hero}>
          <p className="eyebrow">Эксперты и курсы</p>
          <h1>Контент для эксперта — без ощущения, что вы «должны писать»</h1>
          <p className={styles.lead}>
            Аудитория ждёт пользу и живой тон, а вы ведёте сессии и запуски.
            SMM-Agents помогает держать ленту: советы, доверие, мягкие офферы и
            ответы на типовые вопросы.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/register" className="btn">
              Вести блог с агентом
            </Link>
            <Link href="/guides/ii-dlya-smm" className="btn btn-ghost">
              Про ИИ для SMM
            </Link>
          </div>
        </header>

        <div className={styles.body}>
          <section>
            <h2>Боль эксперта в соцсетях</h2>
            <ul className={styles.hooks}>
              <li>
                Знаете тему, но садиться писать пост тяжело
                <span>Черновик по брифу — вы только правите голос</span>
              </li>
              <li>
                В комментариях одни и те же «сколько стоит / как попасть»
                <span>FAQ закрывает 80% рутины без вас</span>
              </li>
              <li>
                Личный бренд + продукт курса путаются в голове
                <span>В брифе разделяете тон, оффер и аудиторию</span>
              </li>
            </ul>
          </section>

          <section>
            <h2>Как это выглядит на практике</h2>
            <ol>
              <li>Описываете нишу, для кого пишете, что продаёте.</li>
              <li>Получаете неделю тем: польза, доверие, общение, оффер.</li>
              <li>Правите 10–20% текста «под себя».</li>
              <li>Публикуете в TG/VK и включаете бота при необходимости.</li>
            </ol>
            <div className={styles.savings}>
              <strong>Голос остаётся вашим</strong>
              <p>
                Агент ускоряет черновик. Публикуете только то, что готовы
                подписать своим именем.
              </p>
            </div>
          </section>

          <section>
            <h2>Частые вопросы</h2>
            <div className={styles.faq}>
              <details>
                <summary>Подойдёт психологам и коучам?</summary>
                <p>
                  Да. Есть отдельные подсказки под экспертные ниши; этика и
                  границы формулировок — на вашей правке перед постом.
                </p>
              </details>
              <details>
                <summary>Можно ли вести и личный блог, и школу?</summary>
                <p>
                  Да — два проекта в одном аккаунте, разные каналы и боты.
                </p>
              </details>
            </div>
          </section>
        </div>

        <aside className={styles.related}>
          <h2>Ещё по теме</h2>
          <ul className={styles.relatedList}>
            <li>
              <Link href="/guides/psiholog-v-socsetyah">Психолог в соцсетях</Link>
            </li>
            <li>
              <Link href="/guides/kontent-plan">Контент-план на неделю</Link>
            </li>
            <li>
              <Link href="/guides/smm-bez-agentstva">SMM без агентства</Link>
            </li>
          </ul>
        </aside>

        <div className={styles.final}>
          <h2>Пусть экспертиза выходит регулярно</h2>
          <p>
            Создайте проект эксперта, укажите тон голоса — и соберите первую
            неделю без пустого экрана.
          </p>
          <Link href="/register" className="btn">
            Открыть кабинет эксперта
          </Link>
        </div>
      </article>
    </SeoPageShell>
  );
}
