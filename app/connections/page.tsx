import Link from "next/link";
import styles from "./connections.module.css";

export default function ConnectionsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div className={`container ${styles.topInner}`}>
          <Link href="/" className={styles.logo}>
            SMM-Agents
          </Link>
          <Link href="/plan" className="btn">
            В кабинет
          </Link>
        </div>
      </header>

      <div className={`container ${styles.wrap}`}>
        <p className="eyebrow">Соцсети</p>
        <h1 className={styles.title}>Подключение каналов — в кабинете</h1>
        <p className={styles.lead}>
          Войдите в аккаунт, откройте свой проект и на вкладке «Каналы»
          добавьте Telegram или VK. У каждого бизнеса — свои настройки.
        </p>
        <Link href="/login" className="btn">
          Войти в кабинет
        </Link>
      </div>
    </main>
  );
}
