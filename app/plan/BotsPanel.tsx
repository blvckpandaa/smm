"use client";

import { useEffect, useState } from "react";
import type { UiLang } from "@/lib/i18n/ui";
import { dict } from "@/lib/i18n/ui";
import type { FaqItem } from "@/lib/bots/types";
import styles from "./plan.module.css";

export type PublicBot = {
  enabled: boolean;
  mode: "faq" | "ai";
  paidUntil: string | null;
  faq: FaqItem[];
  discussionChatId?: string;
  hasVkCallback: boolean;
  paidActive: boolean;
  lastWebhookAt?: string | null;
  lastWebhookType?: string | null;
  lastWebhookNote?: string | null;
};

export type PublicBotReply = {
  id: string;
  channel: "vk" | "telegram";
  mode: "faq" | "ai";
  commentPreview: string;
  replyPreview: string;
  chargedRub: number;
  createdAt: string;
  ok: boolean;
  error?: string;
};

type Prices = {
  botVkPeriodRub: number;
  botTgPeriodRub: number;
  botFaqReplyRub: number;
  botAiReplyRub: number;
  botPeriodDays: number;
};

type Props = {
  uiLang: UiLang;
  projectId: string;
  vkConnected: boolean;
  telegramConnected: boolean;
  bots: { vk: PublicBot; telegram: PublicBot };
  botReplies: PublicBotReply[];
  prices: Prices;
  pending: boolean;
  onBusy: (v: boolean) => void;
  onError: (msg: string | null) => void;
  onNotice: (msg: string | null) => void;
  onProject: (project: unknown) => void;
  onNeedBilling: () => void;
  onGoChannels: () => void;
  balanceRub: number;
};

export function BotsPanel({
  uiLang,
  projectId,
  vkConnected,
  telegramConnected,
  bots,
  botReplies,
  prices,
  pending,
  onBusy,
  onError,
  onNotice,
  onProject,
  onNeedBilling,
  onGoChannels,
  balanceRub,
}: Props) {
  const t = dict[uiLang];
  const [vkFaq, setVkFaq] = useState<FaqItem[]>(bots.vk.faq ?? []);
  const [tgFaq, setTgFaq] = useState<FaqItem[]>(bots.telegram.faq ?? []);
  const [discussionChatId, setDiscussionChatId] = useState(
    bots.telegram.discussionChatId ?? ""
  );
  const [vkSecrets, setVkSecrets] = useState<{
    confirmation?: string;
    secret?: string;
    callbackUrl?: string;
  } | null>(null);
  const callbackIsLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  useEffect(() => {
    setVkFaq(bots.vk.faq ?? []);
  }, [bots.vk.faq]);
  useEffect(() => {
    setTgFaq(bots.telegram.faq ?? []);
    setDiscussionChatId(bots.telegram.discussionChatId ?? "");
  }, [bots.telegram.faq, bots.telegram.discussionChatId]);

  async function activate(channel: "vk" | "telegram") {
    const need =
      channel === "vk" ? prices.botVkPeriodRub : prices.botTgPeriodRub;
    if (balanceRub < need) {
      onError(
        uiLang === "en"
          ? `Need ${need} ₽, balance ${balanceRub} ₽`
          : `Нужно ${need} ₽, на балансе ${balanceRub} ₽`
      );
      onNeedBilling();
      return;
    }
    onBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/bots/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) onNeedBilling();
        throw new Error(data.error || "Activation failed");
      }
      if (data.project) onProject(data.project);
      if (channel === "vk") {
        setVkSecrets({
          confirmation: data.confirmation,
          secret: data.secret,
          callbackUrl: data.callbackUrl,
        });
      }
      onNotice(
        uiLang === "en"
          ? `Bot activated · ${data.billing?.chargedRub ?? need} ₽`
          : `Бот активирован · ${data.billing?.chargedRub ?? need} ₽`
      );
      if (data.warning) onError(data.warning);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      onBusy(false);
    }
  }

  async function patch(
    channel: "vk" | "telegram",
    body: Record<string, unknown>
  ) {
    onBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/bots`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.project) onProject(data.project);
      if (channel === "vk" && (data.confirmation || data.secret)) {
        setVkSecrets({
          confirmation: data.confirmation,
          secret: data.secret,
          callbackUrl: data.callbackUrl,
        });
      }
      onNotice(uiLang === "en" ? "Saved" : "Сохранено");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      onBusy(false);
    }
  }

  async function loadVkSecrets() {
    onBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/bots`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setVkSecrets({
        confirmation: data.vk?.confirmation,
        secret: data.vk?.secret,
        callbackUrl: data.callbackUrl,
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      onBusy(false);
    }
  }

  function renderFaqEditor(
    channel: "vk" | "telegram",
    faq: FaqItem[],
    setFaq: (v: FaqItem[]) => void
  ) {
    return (
      <div className={styles.botFaq}>
        <h4>{t.botsFaqEditor}</h4>
        {faq.map((item, idx) => (
          <div key={idx} className={styles.botFaqRow}>
            <input
              className={styles.fieldControl}
              placeholder={t.botsFaqQ}
              value={item.q}
              onChange={(e) => {
                const next = [...faq];
                next[idx] = { ...next[idx], q: e.target.value };
                setFaq(next);
              }}
            />
            <textarea
              className={styles.fieldControl}
              rows={2}
              placeholder={t.botsFaqA}
              value={item.a}
              onChange={(e) => {
                const next = [...faq];
                next[idx] = { ...next[idx], a: e.target.value };
                setFaq(next);
              }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setFaq(faq.filter((_, i) => i !== idx))}
            >
              ×
            </button>
          </div>
        ))}
        <div className={styles.botFaqActions}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setFaq([...faq, { q: "", a: "" }].slice(0, 30))}
          >
            {t.botsFaqAdd}
          </button>
          <button
            type="button"
            className="btn"
            disabled={pending}
            onClick={() => patch(channel, { faq })}
          >
            {t.botsFaqSave}
          </button>
        </div>
      </div>
    );
  }

  function renderCard(
    channel: "vk" | "telegram",
    connected: boolean,
    bot: PublicBot,
    periodPrice: number
  ) {
    const title = channel === "vk" ? t.botsVkTitle : t.botsTgTitle;
    const faq = channel === "vk" ? vkFaq : tgFaq;
    const setFaq = channel === "vk" ? setVkFaq : setTgFaq;

    return (
      <article className={styles.channelCard}>
        <div className={styles.channelCardHead}>
          <h3>{title}</h3>
          <span
            className={styles.status}
            data-status={bot.paidActive && bot.enabled ? "scheduled" : "draft"}
          >
            {bot.paidActive
              ? bot.enabled
                ? t.botsEnabled
                : t.botsDisabled
              : t.botsNotPaid}
          </span>
        </div>

        {!connected ? (
          <>
            <p>{t.botsNeedChannel}</p>
            <button type="button" className="btn" onClick={onGoChannels}>
              {t.botsGoChannels}
            </button>
          </>
        ) : (
          <>
            <p className={styles.scheduleNote}>
              {bot.paidUntil
                ? `${t.botsPaidUntil}: ${new Date(bot.paidUntil).toLocaleString(
                    uiLang === "en" ? "en-GB" : "ru-RU"
                  )}`
                : t.botsNotPaid}
            </p>

            <div className={styles.botActions}>
              <button
                type="button"
                className="btn"
                disabled={pending}
                onClick={() => activate(channel)}
              >
                {bot.paidActive ? t.botsExtend : t.botsActivate} · {periodPrice}{" "}
                ₽ / {prices.botPeriodDays} {t.botsPeriod}
              </button>
              {bot.paidActive && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pending}
                  onClick={() => patch(channel, { enabled: !bot.enabled })}
                >
                  {bot.enabled ? t.botsDisabled : t.botsEnabled}
                </button>
              )}
            </div>

            <div className={styles.botModeRow}>
              <button
                type="button"
                className={bot.mode === "faq" ? styles.chipOn : styles.chip}
                disabled={pending}
                onClick={() => patch(channel, { mode: "faq" })}
              >
                {t.botsModeFaq} ·{" "}
                {prices.botFaqReplyRub <= 0
                  ? uiLang === "en"
                    ? "free"
                    : "бесплатно"
                  : `${prices.botFaqReplyRub} ₽ ${t.botsPerReply}`}
              </button>
              <button
                type="button"
                className={bot.mode === "ai" ? styles.chipOn : styles.chip}
                disabled={pending}
                onClick={() => patch(channel, { mode: "ai" })}
              >
                {t.botsModeAi} · {prices.botAiReplyRub} ₽ {t.botsPerReply}
              </button>
            </div>
            <p className={styles.cellSub}>
              {bot.mode === "ai" ? t.botsModeAiHint : t.botsModeFaqHint}
            </p>

            {channel === "telegram" && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t.botsDiscussion}</span>
                <input
                  className={styles.fieldControl}
                  value={discussionChatId}
                  onChange={(e) => setDiscussionChatId(e.target.value)}
                  placeholder="-100…"
                />
                <span className={styles.cellSub}>{t.botsDiscussionHint}</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pending}
                  onClick={() =>
                    patch("telegram", {
                      discussionChatId,
                      refreshTelegramWebhook: true,
                    })
                  }
                >
                  {t.botsSave} / {t.botsRefreshHook}
                </button>
              </label>
            )}

            {channel === "vk" && (
              <div className={styles.botVkBox}>
                <h4>{t.botsVkCallback}</h4>
                {callbackIsLocal && (
                  <p className={styles.error}>
                    {uiLang === "en"
                      ? "Localhost only for UI. For VK Callback use production: https://smm-agents.ru (set APP_URL there)."
                      : "Локально UI можно смотреть так. Для Callback VK тестируйте на https://smm-agents.ru (APP_URL на сервере)."}
                  </p>
                )}
                <p className={styles.cellSub}>{t.botsVkHint}</p>
                <ol className={styles.botChecklist}>
                  <li>
                    {bots.vk.paidActive
                      ? "✓ "
                      : "1. "}
                    {uiLang === "en" ? "Bot paid & on" : "Бот оплачен и включён"}
                    {bots.vk.paidActive && bots.vk.enabled ? " ✓" : ""}
                  </li>
                  <li>
                    {uiLang === "en"
                      ? "2. Community → Manage → Callback API → Server URL ="
                      : "2. Сообщество → Управление → Callback API → URL ="}{" "}
                    <code>/api/vk/comments/webhook</code>
                  </li>
                  <li>
                    {uiLang === "en"
                      ? "3. Paste confirmation + secret from cabinet; enable event «Wall reply» (wall_reply_new)"
                      : "3. Вставьте строку подтверждения и секрет из кабинета; событие «Комментарий на стене» (wall_reply_new)"}
                  </li>
                  <li>
                    {bots.vk.lastWebhookAt
                      ? `✓ Callback был: ${new Date(
                          bots.vk.lastWebhookAt
                        ).toLocaleString(uiLang === "en" ? "en-GB" : "ru-RU")}${
                          bots.vk.lastWebhookNote
                            ? ` — ${bots.vk.lastWebhookNote}`
                            : ""
                        }`
                      : uiLang === "en"
                        ? "4. No Callback hits yet — VK never reached this server"
                        : "4. Callback ещё не приходил — VK не достучался до сервера"}
                  </li>
                </ol>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pending}
                  onClick={() => loadVkSecrets()}
                >
                  {t.botsShowSecrets}
                </button>
                {vkSecrets && (
                  <div className={styles.botSecrets}>
                    <p>
                      <strong>{t.botsVkCallbackUrl}</strong>
                      <br />
                      <code>{vkSecrets.callbackUrl}</code>
                    </p>
                    <p>
                      <strong>{t.botsVkConfirm}</strong>
                      <br />
                      <code>{vkSecrets.confirmation}</code>
                    </p>
                    <p>
                      <strong>{t.botsVkSecret}</strong>
                      <br />
                      <code>{vkSecrets.secret}</code>
                    </p>
                  </div>
                )}
              </div>
            )}

            {renderFaqEditor(channel, faq, setFaq)}
          </>
        )}
      </article>
    );
  }

  return (
    <section className={`${styles.panel} ${styles.wide}`}>
      <p className="eyebrow">{t.botsEyebrow}</p>
      <h1 className={styles.title}>{t.botsTitle}</h1>
      <p className={styles.lead}>{t.botsLead}</p>

      <div className={styles.channelCards}>
        {renderCard("vk", vkConnected, bots.vk, prices.botVkPeriodRub)}
        {renderCard(
          "telegram",
          telegramConnected,
          bots.telegram,
          prices.botTgPeriodRub
        )}
      </div>

      <div className={styles.botHistory}>
        <h3>{t.botsHistory}</h3>
        {!botReplies.length ? (
          <p className={styles.cellSub}>{t.botsHistoryEmpty}</p>
        ) : (
          <ul className={styles.botHistoryList}>
            {botReplies.map((r) => (
              <li key={r.id}>
                <div className={styles.botHistoryTop}>
                  <span>
                    {r.channel.toUpperCase()} · {r.mode.toUpperCase()} ·{" "}
                    {r.chargedRub} ₽
                  </span>
                  <span className={styles.cellSub}>
                    {new Date(r.createdAt).toLocaleString(
                      uiLang === "en" ? "en-GB" : "ru-RU"
                    )}
                  </span>
                </div>
                <div className={styles.cellSub}>→ {r.commentPreview}</div>
                <div>
                  {r.ok ? r.replyPreview : r.error || "error"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
