"use client";

import { useEffect, useState } from "react";
import styles from "./SignupBonusHint.module.css";

type Props = {
  /** Compact line under CTA vs card banner */
  variant?: "line" | "banner";
  className?: string;
};

export function SignupBonusHint({ variant = "line", className }: Props) {
  const [bonusRub, setBonusRub] = useState(200);
  const [referralPercent, setReferralPercent] = useState(10);

  useEffect(() => {
    fetch("/api/public/pricing")
      .then((r) => r.json())
      .then((d: { newUserBonusRub?: number; referralPercent?: number }) => {
        if (typeof d.newUserBonusRub === "number") setBonusRub(d.newUserBonusRub);
        if (typeof d.referralPercent === "number") {
          setReferralPercent(d.referralPercent);
        }
      })
      .catch(() => undefined);
  }, []);

  const bonus = bonusRub.toLocaleString("ru-RU");

  if (variant === "banner") {
    return (
      <aside
        className={[styles.banner, className].filter(Boolean).join(" ")}
        aria-label="Бонус за регистрацию"
      >
        <p className={styles.bannerTitle}>
          При регистрации — {bonus} ₽ на баланс
        </p>
        <p className={styles.bannerText}>
          Хватит на несколько постов сразу. Есть промокод друга — введите его:
          друг получит {referralPercent}% с ваших пополнений.
        </p>
      </aside>
    );
  }

  return (
    <p className={[styles.line, className].filter(Boolean).join(" ")}>
      При регистрации начислим{" "}
      <strong>{bonus} ₽</strong> на баланс · рефералка {referralPercent}% с
      пополнений друзей
    </p>
  );
}
