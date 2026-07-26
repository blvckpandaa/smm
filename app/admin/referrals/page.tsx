"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../AdminShell";
import styles from "../admin.module.css";

type Pair = {
  referrerEmail: string;
  referrerName: string;
  inviteeEmail: string;
  inviteeName: string;
  inviteeCreatedAt: string;
  earnedFromInviteeRub: number;
};

type Payout = {
  id: string;
  userId: string;
  amountRub: number;
  description: string;
  createdAt: string;
};

export default function AdminReferralsPage() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [percent, setPercent] = useState(10);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/referrals");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка");
    setPairs(data.pairs || []);
    setPayouts(data.recentPayouts || []);
    setPercent(Number(data.referralPercent) || 10);
    setTotal(Number(data.totalReferralPaidRub) || 0);
  }, []);

  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Ошибка")
    );
  }, [load]);

  return (
    <AdminShell
      title="Рефералка"
      lead={`Реферер получает ${percent}% с каждого пополнения приглашённого. Всего выплачено: ${total.toLocaleString("ru-RU")} ₽.`}
    >
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.card}>
        <h2>Приглашения</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Реферер</th>
                <th>Приглашённый</th>
                <th>Дата</th>
                <th>Заработано с него</th>
              </tr>
            </thead>
            <tbody>
              {pairs.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.muted}>
                    Пока нет приглашений
                  </td>
                </tr>
              ) : (
                pairs.map((p) => (
                  <tr key={`${p.referrerEmail}-${p.inviteeEmail}`}>
                    <td>
                      <strong>{p.referrerName}</strong>
                      <div className={styles.muted}>{p.referrerEmail}</div>
                    </td>
                    <td>
                      <strong>{p.inviteeName}</strong>
                      <div className={styles.muted}>{p.inviteeEmail}</div>
                    </td>
                    <td>
                      {new Date(p.inviteeCreatedAt).toLocaleDateString("ru-RU")}
                    </td>
                    <td>
                      {p.earnedFromInviteeRub.toLocaleString("ru-RU")} ₽
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.card}>
        <h2>Последние реф. начисления</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Сумма</th>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={3} className={styles.muted}>
                    Начислений пока нет
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {new Date(p.createdAt).toLocaleString("ru-RU")}
                    </td>
                    <td>+{p.amountRub.toLocaleString("ru-RU")} ₽</td>
                    <td>{p.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
