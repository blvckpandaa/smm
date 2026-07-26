"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../AdminShell";
import styles from "../admin.module.css";

type Settings = {
  newUserBonusRub: number;
  referralPercent: number;
  postPriceRub: number;
  rewritePriceRub: number;
  imagePriceRub: number;
  botVkPeriodRub: number;
  botTgPeriodRub: number;
  botAiReplyRub: number;
  botFaqReplyRub: number;
  botPeriodDays: number;
  topupPresetsRub: number[];
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [presetsText, setPresetsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка");
    setSettings(data.settings);
    setPresetsText((data.settings.topupPresetsRub || []).join(", "));
  }, []);

  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Ошибка")
    );
  }, [load]);

  async function save() {
    if (!settings) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const topupPresetsRub = presetsText
        .split(/[,;\s]+/)
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, topupPresetsRub }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить");
      setSettings(data.settings);
      setPresetsText((data.settings.topupPresetsRub || []).join(", "));
      setNotice("Настройки сохранены");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  function num(
    key: keyof Settings,
    label: string
  ) {
    if (!settings) return null;
    const value = settings[key];
    if (typeof value !== "number") return null;
    return (
      <label key={key}>
        {label}
        <input
          type="number"
          value={value}
          onChange={(e) =>
            setSettings({
              ...settings,
              [key]: Number(e.target.value) || 0,
            })
          }
        />
      </label>
    );
  }

  return (
    <AdminShell
      title="Настройки"
      lead="Бонус регистрации, процент рефералки, цены услуг и пресеты пополнения."
    >
      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.notice}>{notice}</p>}
      {settings && (
        <div className={styles.card}>
          <h2>Биллинг</h2>
          <div className={styles.formGrid}>
            {num("newUserBonusRub", "Бонус за регистрацию, ₽")}
            {num("referralPercent", "Рефералка, % с пополнения")}
            {num("postPriceRub", "Пост, ₽")}
            {num("rewritePriceRub", "Переписать текст, ₽")}
            {num("imagePriceRub", "Фото, ₽")}
            {num("botVkPeriodRub", "Бот VK / период, ₽")}
            {num("botTgPeriodRub", "Бот TG / период, ₽")}
            {num("botPeriodDays", "Период бота, дней")}
            {num("botAiReplyRub", "ИИ-ответ бота, ₽")}
            {num("botFaqReplyRub", "FAQ-ответ бота, ₽")}
            <label className={styles.full}>
              Пресеты пополнения (через запятую)
              <input
                value={presetsText}
                onChange={(e) => setPresetsText(e.target.value)}
                placeholder="100, 300, 500, 1000, 2000"
              />
            </label>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className="btn"
              disabled={pending}
              onClick={() => void save()}
            >
              {pending ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
