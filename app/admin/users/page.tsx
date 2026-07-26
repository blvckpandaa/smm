"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../AdminShell";
import styles from "../admin.module.css";

type UserRow = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  balanceRub: number;
  referralCode: string;
  referredByEmail?: string;
  invitedCount: number;
  referralEarnedRub: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка");
    setUsers(data.users || []);
  }, []);

  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Ошибка")
    );
  }, [load]);

  async function adjust(userId: string) {
    setError(null);
    setNotice(null);
    const amountRub = Number(amounts[userId]);
    if (!Number.isFinite(amountRub) || amountRub === 0) {
      setError("Укажите сумму корректировки (можно отрицательную)");
      return;
    }
    const res = await fetch(`/api/admin/users/${userId}/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountRub }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Не удалось изменить баланс");
      return;
    }
    setNotice(`Баланс обновлён: ${data.balanceRub} ₽`);
    setAmounts((prev) => ({ ...prev, [userId]: "" }));
    await load();
  }

  return (
    <AdminShell
      title="Пользователи"
      lead="Балансы, промокоды и ручная корректировка."
    >
      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.notice}>{notice}</p>}
      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Баланс</th>
                <th>Промокод</th>
                <th>Пригласил</th>
                <th>Реф.</th>
                <th>Корректировка</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <div className={styles.muted}>{u.email}</div>
                    <div className={styles.muted}>
                      {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                    </div>
                  </td>
                  <td>
                    <strong>{u.balanceRub.toLocaleString("ru-RU")} ₽</strong>
                  </td>
                  <td>
                    <span className={styles.code}>{u.referralCode}</span>
                  </td>
                  <td className={styles.muted}>{u.referredByEmail || "—"}</td>
                  <td>
                    {u.invitedCount} / {u.referralEarnedRub.toLocaleString("ru-RU")}{" "}
                    ₽
                  </td>
                  <td>
                    <div className={styles.inlineForm}>
                      <input
                        type="number"
                        placeholder="+/− ₽"
                        value={amounts[u.id] || ""}
                        onChange={(e) =>
                          setAmounts((prev) => ({
                            ...prev,
                            [u.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => void adjust(u.id)}
                      >
                        OK
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
