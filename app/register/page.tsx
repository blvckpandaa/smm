"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import { BrandLogo } from "../components/BrandLogo";
import { SignupBonusHint } from "../components/SignupBonusHint";
import styles from "../auth.module.css";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref") || searchParams.get("promo");
    if (ref) setPromoCode(ref.toUpperCase());
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d: { user?: unknown }) => {
        if (d.user) router.replace("/plan");
      })
      .catch(() => undefined);
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          name,
          email,
          password,
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось зарегистрироваться");
      router.push("/plan");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardTop}>
          <Link href="/" className={styles.logo}>
            <BrandLogo />
          </Link>
          <ThemeToggle />
        </div>
        <h1 className={styles.title}>Создать аккаунт</h1>
        <SignupBonusHint variant="banner" />
        <p className={styles.lead}>
          Заполните форму — бонус появится на балансе сразу после регистрации.
        </p>

        <form className={styles.form} onSubmit={onSubmit}>
          <label>
            Ваше имя
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Анна"
              required
              autoComplete="name"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              autoComplete="email"
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="минимум 6 символов"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <label>
            Промокод друга (необязательно)
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="SA-XXXXXX"
              autoComplete="off"
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className="btn" disabled={pending}>
            {pending ? "Создаём…" : "Зарегистрироваться"}
          </button>
        </form>

        <p className={styles.footer}>
          Уже есть аккаунт? <Link href="/login">Войти</Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <div className={styles.card}>
            <p className={styles.lead}>Загрузка…</p>
          </div>
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
