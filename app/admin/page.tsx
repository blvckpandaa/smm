"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "./AdminShell";
import styles from "./admin.module.css";

type Stats = {
  usersCount: number;
  balanceSumRub: number;
  topupMonthRub: number;
  chargeMonthRub: number;
  referralPaidMonthRub: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      title="Админка"
      lead="Цены, бонусы регистрации, рефералка и балансы пользователей."
    >
      {error && <p className={styles.error}>{error}</p>}
      {stats && (
        <div className={styles.grid}>
          <div className={styles.stat}>
            <span>Пользователи</span>
            <strong>{stats.usersCount}</strong>
          </div>
          <div className={styles.stat}>
            <span>Сумма балансов</span>
            <strong>{stats.balanceSumRub.toLocaleString("ru-RU")} ₽</strong>
          </div>
          <div className={styles.stat}>
            <span>Пополнения за месяц</span>
            <strong>{stats.topupMonthRub.toLocaleString("ru-RU")} ₽</strong>
          </div>
          <div className={styles.stat}>
            <span>Списания за месяц</span>
            <strong>{stats.chargeMonthRub.toLocaleString("ru-RU")} ₽</strong>
          </div>
          <div className={styles.stat}>
            <span>Реф. выплаты за месяц</span>
            <strong>
              {stats.referralPaidMonthRub.toLocaleString("ru-RU")} ₽
            </strong>
          </div>
        </div>
      )}
      <div className={styles.card}>
        <h2>Быстрые ссылки</h2>
        <p className={styles.muted}>
          Настройки цен и бонуса — в разделе «Настройки». Реферальные пары и
          выплаты — в «Рефералка». Корректировка балансов — в «Пользователи».
        </p>
      </div>
    </AdminShell>
  );
}
