import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageShell } from "../../components/SeoPageShell";
import styles from "../guides.module.css";

export const metadata: Metadata = {
  title: "Контент-план на неделю для Telegram и VK",
  description:
    "Контент-план на неделю: темы, тексты и слоты публикаций для Telegram и VK. Соберите план в кабинете SMM-Agents.",
  alternates: { canonical: "/guides/kontent-plan" },
  openGraph: {
    title: "Контент-план на неделю — SMM-Agents",
    description:
      "Недельный план постов с разным временем выхода — без пустой таблицы в Excel.",
    url: "/guides/kontent-plan",
  },
};

const related = [
  { href: "/guides/ii-dlya-smm", label: "ИИ для SMM" },
  { href: "/guides/avtoposting-telegram-vk", label: "Автопостинг TG и VK" },
  { href: "/guides/bot-kommentariev-vk", label: "Бот комментариев VK" },
];

export default function KontentPlanPage() {
  return (
    <SeoPageShell>
      <article className={`container ${styles.article}`}>
        <nav className={styles.crumb} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span>Контент-план</span>
        </nav>

        <header className={styles.hero}>
          <p className="eyebrow">Контент-план</p>
          <h1>Контент-план на неделю для Telegram и VK</h1>
          <p className={styles.lead}>
            Вместо пустой таблицы — готовые темы, тексты и время выхода. Агент
            опирается на бриф бизнеса и собирает неделю постов в кабинете
            SMM-Agents.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/register" className="btn">
              Собрать план
            </Link>
            <Link href="/#price" className="btn btn-ghost">
              Стоимость поста
            </Link>
          </div>
        </header>

        <div className={styles.body}>
          <section>
            <h2>Из чего состоит сильный план</h2>
            <p>
              Хорошая неделя смешивает пользу, доверие, общение и мягкие офферы —
              не одну сплошную рекламу. В кабинете видно распределение тем, а не
              только «пост 1 / пост 2».
            </p>
            <ul>
              <li>Общение с аудиторией</li>
              <li>Полезные советы</li>
              <li>Доверие и кейсы</li>
              <li>Акции и офферы</li>
              <li>О бренде и экспертности</li>
            </ul>
          </section>

          <section>
            <h2>Как агент собирает неделю</h2>
            <ol>
              <li>Вы задаёте нишу, тон, оффер и число постов в неделю.</li>
              <li>Агент предлагает план со слотами по дням и времени.</li>
              <li>Генерируются тексты — их можно править до публикации.</li>
              <li>Посты уходят в очередь Telegram / VK или публикуются сразу.</li>
            </ol>
          </section>

          <section>
            <h2>После плана</h2>
            <p>
              Все материалы остаются в таблице постов: фильтры «нужно сделать»,
              «сегодня», «черновики», «в очереди». Если текст не зашёл —
              перепишите за 25&nbsp;₽, не собирая неделю заново.
            </p>
          </section>

          <section>
            <h2>Частые вопросы</h2>
            <div className={styles.faq}>
              <details>
                <summary>Сколько стоит неделя?</summary>
                <p>
                  Списание идёт за посты в плане: 50&nbsp;₽ за пост. Итого зависит
                  от выбранного числа публикаций в неделю.
                </p>
              </details>
              <details>
                <summary>Можно ли сдвинуть время поста?</summary>
                <p>
                  Да. В карточке поста меняется день и время локальной зоны
                  бизнеса, затем слот снова ставится в очередь.
                </p>
              </details>
              <details>
                <summary>План только для одного канала?</summary>
                <p>
                  План строится под проект; посты назначаются на подключённые
                  каналы Telegram и VK.
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
          <h2>Получите план на эту неделю</h2>
          <p>
            Создайте бизнес в кабинете, укажите ритм публикаций и соберите первую
            неделю контента.
          </p>
          <Link href="/register" className="btn">
            Открыть SMM-Agents
          </Link>
        </div>
      </article>
    </SeoPageShell>
  );
}
