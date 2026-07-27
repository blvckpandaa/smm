"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import styles from "../page.module.css";

type User = { id: string; name: string; email: string };

export function SiteHeaderActions() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d: { user?: User | null }) => setUser(d.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <div className={styles.headerActions}>
        <ThemeToggle />
        <Link href="/register" className="btn">
          Начать · бонус 200 ₽
        </Link>
      </div>
    );
  }

  if (user) {
    return (
      <div className={styles.headerActions}>
        <ThemeToggle />
        <Link href="/plan" className="btn">
          В кабинет
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.headerActions}>
      <ThemeToggle />
      <Link href="/login" className={styles.navTextLink}>
        Вход
      </Link>
      <Link href="/register" className="btn">
        Начать · бонус 200 ₽
      </Link>
    </div>
  );
}

export function HomeCtaButtons() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d: { user?: unknown }) => setLoggedIn(Boolean(d.user)))
      .catch(() => setLoggedIn(false))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <>
        <Link href="/register" className="btn">
          Создать аккаунт · +200 ₽
        </Link>
        <a href="#how" className="btn btn-ghost">
          Смотреть как
        </a>
      </>
    );
  }

  if (loggedIn) {
    return (
      <>
        <Link href="/plan" className="btn">
          Открыть кабинет
        </Link>
        <a href="#how" className="btn btn-ghost">
          Смотреть как
        </a>
      </>
    );
  }

  return (
    <>
      <Link href="/register" className="btn">
        Создать аккаунт · +200 ₽
      </Link>
      <a href="#how" className="btn btn-ghost">
        Смотреть как
      </a>
    </>
  );
}

export function HomeHowCta() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d: { user?: unknown }) => setLoggedIn(Boolean(d.user)))
      .catch(() => setLoggedIn(false));
  }, []);

  if (loggedIn) {
    return (
      <Link href="/plan" className="btn">
        Открыть кабинет
      </Link>
    );
  }

  return (
    <Link href="/register" className="btn">
      Зарегистрироваться · +200 ₽
    </Link>
  );
}

export function HomeFinalCta() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d: { user?: unknown }) => setLoggedIn(Boolean(d.user)))
      .catch(() => setLoggedIn(false))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <>
        <Link href="/register" className="btn">
          Создать аккаунт · +200 ₽
        </Link>
        <Link href="/login" className="btn btn-ghost">
          У меня уже есть аккаунт
        </Link>
      </>
    );
  }

  if (loggedIn) {
    return (
      <Link href="/plan" className="btn">
        Перейти в кабинет
      </Link>
    );
  }

  return (
    <>
      <Link href="/register" className="btn">
        Создать аккаунт · +200 ₽
      </Link>
      <Link href="/login" className="btn btn-ghost">
        У меня уже есть аккаунт
      </Link>
    </>
  );
}
