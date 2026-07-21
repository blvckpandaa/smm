import Link from "next/link";
import {
  HomeCtaButtons,
  HomeFinalCta,
  HomeHowCta,
  SiteHeaderActions,
} from "./components/HomeAuth";
import styles from "./page.module.css";

const sampleSlots = [
  { time: "12:17", channel: "TG", topic: "Полезный совет клиентам" },
  { time: "19:12", channel: "TG", topic: "Вопрос подписчикам" },
  { time: "19:24", channel: "VK", topic: "История из работы" },
  { time: "13:17", channel: "IG", topic: "Акция недели" },
];

export default function HomePage() {
  return (
    <main>
      <header className={styles.nav}>
        <div className={`container ${styles.navInner}`}>
          <Link href="/" className={styles.logo}>
            SMM-Agents
          </Link>
          <SiteHeaderActions />
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroWash} aria-hidden />
        <div className={styles.heroGrain} aria-hidden />
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroBrandBlock}>
            <p className={`eyebrow rise`}>ИИ-агент для соцсетей</p>
            <h1 className={`${styles.brand} rise rise-delay-1`}>SMM-Agents</h1>
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={`${styles.headline} rise rise-delay-2`}>
                Агент сам придумает посты и подскажет, когда их публиковать
              </p>
              <p className={`${styles.lead} rise rise-delay-2`}>
                Расскажите о бизнесе — получите план на неделю и готовые тексты
                для Telegram и VK. Вы только проверяете и нажимаете «опубликовать».
              </p>
              <div className={`${styles.ctaRow} rise rise-delay-3`}>
                <HomeCtaButtons />
              </div>
            </div>

            <div className={`${styles.heroVisual} rise rise-delay-2`} aria-hidden>
              <div className={styles.timeline}>
                <div className={styles.timelineHead}>
                  <span>План на неделю</span>
                  <span className={styles.live}>live</span>
                </div>
                <div className={styles.rail}>
                  {sampleSlots.map((slot) => (
                    <div key={slot.time + slot.channel} className={styles.slot}>
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

      <section id="who" className={styles.section}>
        <div className="container">
          <p className="eyebrow">Кому подходит</p>
          <h2 className={styles.sectionTitle}>Любому бизнесу, где нужны посты</h2>
          <p className={styles.sectionLead}>
            Не важно, кафе у вас или онлайн-курсы — агент подстроится под вашу
            аудиторию.
          </p>
          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <h3>Магазины и услуги рядом</h3>
              <p>Кафе, салоны, клиники, спортзалы — регулярные посты без SMM-отдела.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Эксперты и курсы</h3>
              <p>Полезный контент, доверие и мягкие предложения без спама.</p>
            </li>
            <li>
              <span>03</span>
              <h3>Несколько брендов</h3>
              <p>Каждый клиент или бренд — отдельный проект со своими каналами.</p>
            </li>
          </ol>
        </div>
      </section>

      <section id="how" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className="container">
          <p className="eyebrow">Как это работает</p>
          <h2 className={styles.sectionTitle}>Три простых шага</h2>
          <p className={styles.sectionLead}>
            Без сложных настроек. Сначала план, потом тексты, потом публикация.
          </p>
          <div className={styles.featureSplit}>
            <div className={styles.featureCopy}>
              <h3>1. Коротко опишите бизнес</h3>
              <p>Чем занимаетесь, для кого, в каком тоне писать.</p>
              <h3>2. Агент готовит план и тексты</h3>
              <p>Темы, время публикаций и готовые посты на неделю.</p>
              <h3>3. Вы проверяете и публикуете</h3>
              <p>Можно поправить текст и отправить в Telegram или VK в один клик.</p>
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

      <section className={styles.section}>
        <div className={`container ${styles.final}`}>
          <h2 className={styles.sectionTitle}>Попробуйте сегодня</h2>
          <p className={styles.sectionLead}>
            Создайте аккаунт, добавьте бизнес и получите первый план за пару минут.
          </p>
          <div className={styles.ctaRow}>
            <HomeFinalCta />
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`container ${styles.footerInner}`}>
          <span className={styles.logo}>SMM-Agents</span>
          <p>
            Посты для соцсетей с помощью ИИ-агента.{" "}
            <a href="https://smm-agents.ru">smm-agents.ru</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
