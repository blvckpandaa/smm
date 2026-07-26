import Link from "next/link";
import {
  HomeCtaButtons,
  HomeFinalCta,
  HomeHowCta,
  SiteHeaderActions,
} from "./components/HomeAuth";
import { BrandLogo } from "./components/BrandLogo";
import styles from "./page.module.css";

const sampleSlots = [
  { time: "12:17", channel: "TG", topic: "Полезный совет клиентам" },
  { time: "19:12", channel: "VK", topic: "Ответ бота на комментарий" },
  { time: "19:24", channel: "VK", topic: "История из работы" },
  { time: "13:17", channel: "TG", topic: "Вопрос подписчикам" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://smm-agents.ru/#website",
      url: "https://smm-agents.ru/",
      name: "SMM-Agents",
      alternateName: ["SMM Agents", "smm-agents.ru"],
      description:
        "ИИ-кабинет для Telegram и VK: план постов, автопубликация и боты комментариев",
      inLanguage: "ru-RU",
      publisher: { "@id": "https://smm-agents.ru/#org" },
      image: "https://smm-agents.ru/logo-512.png",
    },
    {
      "@type": "Organization",
      "@id": "https://smm-agents.ru/#org",
      name: "SMM-Agents",
      legalName: "SMM-Agents",
      url: "https://smm-agents.ru/",
      logo: {
        "@type": "ImageObject",
        "@id": "https://smm-agents.ru/#logo",
        url: "https://smm-agents.ru/logo-512.png",
        contentUrl: "https://smm-agents.ru/logo-512.png",
        width: 512,
        height: 512,
        caption: "SMM-Agents",
      },
      image: "https://smm-agents.ru/logo-512.png",
      sameAs: ["https://smm-agents.ru"],
    },
    {
      "@type": "SoftwareApplication",
      name: "SMM-Agents",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://smm-agents.ru/",
      image: "https://smm-agents.ru/logo-512.png",
      description:
        "Сервис для генерации и публикации постов в Telegram и VK, а также автоответов на комментарии с помощью FAQ или ИИ",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "RUB",
        description: "Регистрация и старт с пополнением баланса",
      },
      publisher: { "@id": "https://smm-agents.ru/#org" },
    },
  ],
};

export default function HomePage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className={styles.nav}>
        <div className={`container ${styles.navInner}`}>
          <Link href="/" className={styles.logo}>
            <BrandLogo />
          </Link>
          <nav className={styles.navLinks} aria-label="Разделы">
            <a href="#new">Новое</a>
            <a href="#how">Как работает</a>
            <a href="#price">Цены</a>
          </nav>
          <SiteHeaderActions />
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroWash} aria-hidden />
        <div className={styles.heroGrain} aria-hidden />
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroBrandBlock}>
            <p className={`eyebrow rise`}>ИИ-агент для соцсетей · smm-agents.ru</p>
            <h1 className={`${styles.brand} rise rise-delay-1`}>SMM-Agents</h1>
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={`${styles.headline} rise rise-delay-2`}>
                Посты, расписание и ответы на комментарии — в одном кабинете
              </p>
              <p className={`${styles.lead} rise rise-delay-2`}>
                Агент пишет контент для Telegram и VK, публикует по плану и
                отвечает в комментариях: FAQ или ИИ.
              </p>
              <div className={`${styles.ctaRow} rise rise-delay-3`}>
                <HomeCtaButtons />
              </div>
            </div>

            <div className={`${styles.heroVisual} rise rise-delay-2`} aria-hidden>
              <div className={styles.timeline}>
                <div className={styles.timelineHead}>
                  <span>Сегодня в ленте</span>
                  <span className={styles.live}>live</span>
                </div>
                <div className={styles.rail}>
                  {sampleSlots.map((slot) => (
                    <div key={slot.time + slot.channel + slot.topic} className={styles.slot}>
                      <div className={styles.slotMeta}>
                        <strong>{slot.time}</strong>
                        <span>{slot.channel}</span>
                      </div>
                      <p>{slot.topic}</p>
                    </div>
                  ))}
                </div>
                <div className={styles.scan} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="new" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className="container">
          <p className="eyebrow">Новые возможности</p>
          <h2 className={styles.sectionTitle}>Больше, чем генератор постов</h2>
          <p className={styles.sectionLead}>
            Кабинет вырос: управление контентом, боты в комментариях и понятные
            цены с баланса.
          </p>
          <div className={styles.capabilityList}>
            <article>
              <h3>Боты комментариев VK и Telegram</h3>
              <p>
                Отдельное подключение на 30 дней. Режим FAQ — бесплатные ответы
                из вашей базы. Режим ИИ — короткий ответ по брифу за 2&nbsp;₽.
              </p>
            </article>
            <article>
              <h3>Таблица всех постов</h3>
              <p>
                Черновики, очередь и опубликованное в одном месте: фильтры по
                каналу и статусу, правка текста, фото и публикация в один клик.
              </p>
            </article>
            <article>
              <h3>Переписать и новое фото</h3>
              <p>
                Не нравится текст или картинка — пересобрать за 25&nbsp;₽ без
                новой недели плана. Баланс пополняется в кабинете.
              </p>
            </article>
            <article>
              <h3>Telegram и VK уже в работе</h3>
              <p>
                Подключите каналы, соберите план на неделю и публикуйте. Facebook
                и X — в подготовке.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="who" className={styles.section}>
        <div className="container">
          <p className="eyebrow">Кому подходит</p>
          <h2 className={styles.sectionTitle}>Любому бизнесу, где нужны посты</h2>
          <p className={styles.sectionLead}>
            Не важно, кафе у вас или онлайн-курсы — агент подстроится под вашу
            аудиторию и поможет не оставлять комментарии без ответа.
          </p>
          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <h3>Магазины и услуги рядом</h3>
              <p>Кафе, салоны, клиники — посты и автоответы без SMM-отдела.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Эксперты и курсы</h3>
              <p>Полезный контент, доверие и ответы на частые вопросы из FAQ.</p>
            </li>
            <li>
              <span>03</span>
              <h3>Несколько брендов</h3>
              <p>Каждый бизнес — отдельный проект, свои каналы и свои боты.</p>
            </li>
          </ol>
        </div>
      </section>

      <section id="how" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className="container">
          <p className="eyebrow">Как это работает</p>
          <h2 className={styles.sectionTitle}>От брифа до ответа в комментарии</h2>
          <p className={styles.sectionLead}>
            Сначала контент, потом каналы, потом бот — всё в одном кабинете на
            smm-agents.ru.
          </p>
          <div className={styles.featureSplit}>
            <div className={styles.featureCopy}>
              <h3>1. Опишите бизнес</h3>
              <p>Ниша, тон, сайт, ритм публикаций.</p>
              <h3>2. Получите план и тексты</h3>
              <p>Агент собирает неделю постов с разным временем выхода.</p>
              <h3>3. Публикуйте и отвечайте</h3>
              <p>
                Проверьте ленту, отправьте в TG/VK и включите бота комментариев.
              </p>
              <HomeHowCta />
            </div>
            <div className={styles.mixBoard} aria-label="Из чего состоит лента">
              <div>
                <strong>25%</strong>
                <span>общение</span>
              </div>
              <div>
                <strong>20%</strong>
                <span>польза</span>
              </div>
              <div>
                <strong>20%</strong>
                <span>доверие</span>
              </div>
              <div>
                <strong>15%</strong>
                <span>акции</span>
              </div>
              <div>
                <strong>20%</strong>
                <span>о бренде</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="price" className={styles.section}>
        <div className="container">
          <p className="eyebrow">Цены</p>
          <h2 className={styles.sectionTitle}>Прозрачно с баланса</h2>
          <p className={styles.sectionLead}>
            Без скрытых подписок на всё сразу — платите за то, чем пользуетесь.
          </p>
          <ul className={styles.priceList}>
            <li>
              <strong>50 ₽</strong>
              <span>пост в недельном плане</span>
            </li>
            <li>
              <strong>25 ₽</strong>
              <span>переписать текст или новое фото</span>
            </li>
            <li>
              <strong>290 ₽</strong>
              <span>бот комментариев VK или TG на 30 дней</span>
            </li>
            <li>
              <strong>0 / 2 ₽</strong>
              <span>ответ FAQ бесплатно · ответ ИИ — 2 ₽</span>
            </li>
          </ul>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`container ${styles.final}`}>
          <h2 className={styles.sectionTitle}>Откройте кабинет на smm-agents.ru</h2>
          <p className={styles.sectionLead}>
            Создайте аккаунт, добавьте бизнес и запустите первую неделю контента
            — ботов подключите, когда будете готовы.
          </p>
          <div className={styles.ctaRow}>
            <HomeFinalCta />
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`container ${styles.footerInner}`}>
          <BrandLogo />
          <nav className={styles.footerLinks} aria-label="Полезные страницы">
            <Link href="/guides/smm-bez-agentstva">Без агентства</Link>
            <Link href="/guides/ne-uspevayu-vesti-socseti">Нет времени</Link>
            <Link href="/guides/posts-dlya-kafe">Кафе и услуги</Link>
            <Link href="/guides/kontent-dlya-eksperta">Эксперты</Link>
            <Link href="/guides/psiholog-v-socsetyah">Психологи</Link>
            <Link href="/guides">Все гайды</Link>
          </nav>
          <p>
            Посты, расписание и боты комментариев.{" "}
            <a href="https://smm-agents.ru">smm-agents.ru</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
