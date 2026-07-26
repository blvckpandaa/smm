"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import {
  CRYPTO_ASSETS,
  CRYPTO_WALLET_OPTIONS,
  cryptoAssetsForWallet,
  type CryptoAssetId,
  type CryptoWalletHint,
} from "@/lib/billing/crypto-assets";
import { UI_LANG_KEY, dict, type UiLang } from "@/lib/i18n/ui";
import styles from "../plan.module.css";

type LedgerRow = {
  id: string;
  type?: string;
  amountRub: number;
  description: string;
  createdAt: string;
};

type BillingUser = {
  id: string;
  name: string;
  email: string;
  daysWithUs: number;
};

export default function BillingPage() {
  const [uiLang, setUiLang] = useState<UiLang>("ru");
  const t = dict[uiLang];
  const en = uiLang === "en";
  const loc = en ? "en-US" : "ru-RU";
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [balanceRub, setBalanceRub] = useState(0);
  const [spentMonthRub, setSpentMonthRub] = useState(0);
  const [topupMonthRub, setTopupMonthRub] = useState(0);
  const [postPriceRub, setPostPriceRub] = useState(50);
  const [rewritePriceRub, setRewritePriceRub] = useState(25);
  const [imagePriceRub, setImagePriceRub] = useState(25);
  const [botVkPeriodRub, setBotVkPeriodRub] = useState(290);
  const [topupPresets, setTopupPresets] = useState<number[]>([
    100, 300, 500, 1000, 2000,
  ]);
  const [topupAmount, setTopupAmount] = useState(500);
  const [payMethod, setPayMethod] = useState<"card" | "crypto">("card");
  const [walletHint, setWalletHint] = useState<CryptoWalletHint>("trust");
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAssetId>("usdt_trc20");
  const [yookassaConfigured, setYookassaConfigured] = useState(false);
  const [cryptoConfigured, setCryptoConfigured] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [user, setUser] = useState<BillingUser | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [referralPercent, setReferralPercent] = useState(10);
  const [invitedCount, setInvitedCount] = useState(0);
  const [referralEarned, setReferralEarned] = useState(0);
  const topupRef = useRef<HTMLElement | null>(null);

  const assets = useMemo(
    () => cryptoAssetsForWallet(walletHint),
    [walletHint]
  );

  const selectedAsset =
    CRYPTO_ASSETS.find((a) => a.id === cryptoAsset) ?? assets[0] ?? null;

  useEffect(() => {
    if (!assets.some((a) => a.id === cryptoAsset) && assets[0]) {
      setCryptoAsset(assets[0].id);
    }
  }, [assets, cryptoAsset]);

  const refreshBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing");
      if (res.status === 401) {
        window.location.href = "/login?next=/plan/billing";
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setBalanceRub(Number(data.balanceRub) || 0);
      setSpentMonthRub(Number(data.spentMonthRub) || 0);
      setTopupMonthRub(Number(data.topupMonthRub) || 0);
      setPostPriceRub(Number(data.postPriceRub) || 50);
      setRewritePriceRub(Number(data.rewritePriceRub) || 25);
      setImagePriceRub(Number(data.imagePriceRub) || 25);
      setBotVkPeriodRub(Number(data.botVkPeriodRub) || 290);
      if (Array.isArray(data.topupPresets)) setTopupPresets(data.topupPresets);
      setYookassaConfigured(Boolean(data.yookassaConfigured));
      setCryptoConfigured(Boolean(data.cryptoConfigured));
      setLedger(Array.isArray(data.ledger) ? data.ledger : []);
      if (data.user) {
        setUser({
          id: String(data.user.id),
          name: String(data.user.name || ""),
          email: String(data.user.email || ""),
          daysWithUs: Number(data.user.daysWithUs) || 1,
        });
      }
      if (data.referral) {
        setReferralCode(String(data.referral.referralCode || ""));
        setInviteUrl(String(data.referral.inviteUrl || ""));
        setReferralPercent(Number(data.referral.referralPercent) || 10);
        setInvitedCount(Number(data.referral.invitedCount) || 0);
        setReferralEarned(Number(data.referral.earnedRub) || 0);
      } else if (typeof data.referralPercent === "number") {
        setReferralPercent(data.referralPercent);
      }
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(UI_LANG_KEY);
    if (saved === "en" || saved === "ru") setUiLang(saved);
  }, []);

  useEffect(() => {
    void refreshBilling();
  }, [refreshBilling]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (billing === "return" || billing === "crypto_ok") {
      const paymentId = localStorage.getItem("smm-agents-pending-payment");
      if (paymentId && billing === "return") {
        void fetch("/api/billing/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (typeof data.balanceRub === "number") {
              setBalanceRub(data.balanceRub);
            }
            setNotice(
              en
                ? "Payment checked. Balance updated if payment succeeded."
                : "Платёж проверен. Баланс обновлён, если оплата прошла."
            );
            localStorage.removeItem("smm-agents-pending-payment");
            void refreshBilling();
          })
          .catch(() => void refreshBilling());
      } else {
        setNotice(
          en
            ? "If payment succeeded, the balance will update in a moment."
            : "Если оплата прошла, баланс обновится через несколько секунд."
        );
        void refreshBilling();
      }
      window.history.replaceState({}, "", "/plan/billing");
    }
  }, [refreshBilling, en]);

  function openTopup() {
    requestAnimationFrame(() => {
      topupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function topUpBalance() {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountRub: topupAmount,
          method: payMethod,
          cryptoAsset: payMethod === "crypto" ? cryptoAsset : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка пополнения");
      if (data.confirmationUrl) {
        localStorage.setItem("smm-agents-pending-payment", data.paymentId || "");
        window.location.href = data.confirmationUrl;
        return;
      }
      if (typeof data.balanceRub === "number") setBalanceRub(data.balanceRub);
      setNotice(
        data.message ||
          (en
            ? `Balance topped up by ${topupAmount} ₽`
            : `Баланс пополнен на ${topupAmount} ₽`)
      );
      await refreshBilling();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  const monthName = new Date().toLocaleString(loc, { month: "long" });
  const initials = (user?.name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const payLabel = (() => {
    if (pending) return en ? "Processing…" : "Оформляем…";
    const sum = topupAmount.toLocaleString(loc);
    if (payMethod === "crypto" && selectedAsset) {
      return en
        ? `Pay ${sum} ₽ · ${selectedAsset.symbol}`
        : `Оплатить ${sum} ₽ · ${selectedAsset.symbol}`;
    }
    return en ? `Top up ${sum} ₽` : `Пополнить на ${sum} ₽`;
  })();

  if (!loaded) {
    return (
      <main className={styles.page}>
        <div className={`container ${styles.fcWrap}`}>
          <p className={styles.lead}>{t.loading}</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div className={`container ${styles.topInner}`}>
          <Link href="/plan" className={styles.logo}>
            <BrandLogo />
          </Link>
          <div className={styles.projectBar}>
            <ThemeToggle
              labels={{ light: t.themeLight, dark: t.themeDark }}
            />
            <Link href="/plan" className="btn btn-ghost">
              {en ? "Back to cabinet" : "В кабинет"}
            </Link>
          </div>
        </div>
      </header>

      <div className={`container ${styles.fcWrap}`}>
        <h1 className={styles.fcTitle}>
          {en ? (
            <>
              Your <span>wallet</span>
            </>
          ) : (
            <>
              Ваш <span>кошелёк</span>
            </>
          )}
        </h1>
        <p className={styles.fcLead}>
          {en
            ? "Top up by card or SBP. Crypto payments are coming soon."
            : "Пополнение картой или СБП. Крипта — скоро."}
        </p>

        {error && <p className={styles.error}>{error}</p>}
        {notice && <p className={styles.notice}>{notice}</p>}

        <div className={styles.fcGrid}>
          <section className={styles.fcBalance} aria-label={en ? "Balance" : "Баланс"}>
            <div className={styles.fcBalanceTop}>
              <div>
                <p className={styles.fcBalanceLabel}>
                  {en ? "Current balance" : "Текущий баланс"}
                </p>
                <p className={styles.fcBalanceValue}>
                  {balanceRub.toLocaleString(loc)} ₽
                </p>
              </div>
              <button
                type="button"
                className={styles.fcTopupBtn}
                onClick={openTopup}
              >
                + {en ? "Top up" : "Пополнить"}
              </button>
            </div>
            <svg
              className={styles.fcSpark}
              viewBox="0 0 320 72"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M0 52 C40 48 55 28 90 34 C125 40 140 18 175 22 C210 26 230 48 260 40 C285 34 305 20 320 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M0 72 L0 52 C40 48 55 28 90 34 C125 40 140 18 175 22 C210 26 230 48 260 40 C285 34 305 20 320 16 L320 72 Z"
                fill="currentColor"
                opacity="0.12"
              />
            </svg>
            <div className={styles.fcBalanceStats}>
              <div>
                <span>
                  {en ? `Spent in ${monthName}` : `Потрачено за ${monthName}`}
                </span>
                <strong>{spentMonthRub.toLocaleString(loc)} ₽</strong>
              </div>
              <div>
                <span>{en ? "Topped up this month" : "Пополнено за месяц"}</span>
                <strong>{topupMonthRub.toLocaleString(loc)} ₽</strong>
              </div>
            </div>
          </section>

          <aside className={styles.fcSide}>
            <div className={styles.fcCard}>
              <h2 className={styles.fcCardTitle}>
                {en ? "Wallets & networks" : "Кошельки и сети"}
              </h2>
              <ul className={styles.fcTips}>
                <li>
                  <strong>{en ? "Card / SBP" : "Карта / СБП"}</strong>
                  <span>{en ? "Via YooKassa" : "Через ЮKassa"}</span>
                </li>
                <li>
                  <strong>{en ? "Crypto" : "Крипта"}</strong>
                  <span>{en ? "Coming soon" : "Скоро"}</span>
                </li>
                <li>
                  <strong>{en ? "Referral" : "Рефералка"}</strong>
                  <span>
                    {en
                      ? `${referralPercent}% of friends' top-ups`
                      : `${referralPercent}% с пополнений друзей`}
                  </span>
                </li>
              </ul>
            </div>

            {user && (
              <div className={`${styles.fcCard} ${styles.fcProfile}`}>
                <div className={styles.fcProfileHead}>
                  <span className={styles.fcAvatar} aria-hidden>
                    {initials}
                  </span>
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                </div>
                <div className={styles.fcProfileStats}>
                  <div>
                    <em>{en ? "Days" : "Дней"}</em>
                    <b>{user.daysWithUs}</b>
                  </div>
                  <div>
                    <em>{en ? "Ops" : "Операций"}</em>
                    <b>{ledger.length}</b>
                  </div>
                  <div>
                    <em>{en ? "Plan" : "Тариф"}</em>
                    <b>Pay-as-you-go</b>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        <section className={`${styles.fcCard} ${styles.fcRef}`}>
          <h2 className={styles.fcCardTitle}>
            {en ? "Referral promo code" : "Реферальный промокод"}
          </h2>
          <p className={styles.fcMuted}>
            {en
              ? `Share your code — you earn ${referralPercent}% of every top-up by friends who register with it.`
              : `Поделитесь кодом — вы получаете ${referralPercent}% с каждого пополнения друзей, зарегистрировавшихся по нему.`}
          </p>
          <div className={styles.fcRefRow}>
            <code className={styles.fcRefCode}>{referralCode || "—"}</code>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!referralCode}
              onClick={() => {
                void navigator.clipboard.writeText(referralCode);
                setNotice(
                  en ? "Promo code copied" : "Промокод скопирован"
                );
              }}
            >
              {en ? "Copy code" : "Копировать код"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!inviteUrl}
              onClick={() => {
                void navigator.clipboard.writeText(inviteUrl);
                setNotice(en ? "Invite link copied" : "Ссылка скопирована");
              }}
            >
              {en ? "Copy link" : "Копировать ссылку"}
            </button>
          </div>
          <div className={styles.fcRefStats}>
            <div>
              <span>{en ? "Invited" : "Приглашено"}</span>
              <strong>{invitedCount}</strong>
            </div>
            <div>
              <span>{en ? "Earned" : "Заработано"}</span>
              <strong>{referralEarned.toLocaleString(loc)} ₽</strong>
            </div>
            <div>
              <span>{en ? "Your cut" : "Ваш %"}</span>
              <strong>{referralPercent}%</strong>
            </div>
          </div>
        </section>

        <section ref={topupRef} className={styles.fcPay} id="topup">
          <div className={styles.fcPayHead}>
            <div>
              <h2 className={styles.fcCardTitle}>
                {en ? "Top up" : "Пополнение"}
              </h2>
              <p className={styles.fcMuted}>
                {en
                  ? "Choose method, coin and amount — then pay securely."
                  : "Выберите способ, монету и сумму — дальше безопасная оплата."}
              </p>
            </div>
          </div>

          <div className={styles.fcPayBody}>
              <p className={styles.walletSectionLabel}>
                {en ? "1. Payment method" : "1. Способ оплаты"}
              </p>
              <div className={styles.fcMethodGrid}>
                <button
                  type="button"
                  className={
                    payMethod === "card" ? styles.fcMethodOn : styles.fcMethod
                  }
                  onClick={() => setPayMethod("card")}
                >
                  <span className={styles.fcMethodIcon} aria-hidden>
                    ₽
                  </span>
                  <strong>{en ? "Card / SBP" : "Карта / СБП"}</strong>
                  <small>
                    {yookassaConfigured
                      ? en
                        ? "YooKassa"
                        : "ЮKassa"
                      : en
                        ? "Demo mode"
                        : "Демо-режим"}
                  </small>
                </button>
                <button
                  type="button"
                  className={`${styles.fcMethod} ${styles.fcMethodSoon}`}
                  disabled
                  aria-disabled="true"
                  title={en ? "Coming soon" : "Скоро"}
                >
                  <span className={styles.fcMethodIcon} aria-hidden>
                    ◈
                  </span>
                  <strong>{en ? "Crypto" : "Крипта"}</strong>
                  <small>{en ? "Coming soon" : "Скоро"}</small>
                </button>
              </div>

              {payMethod === "card" && !yookassaConfigured && (
                <p className={styles.walletNote}>
                  {en
                    ? "YooKassa is not configured — top-ups go to demo balance."
                    : "ЮKassa не настроена — пополнение идёт в демо-баланс."}
                </p>
              )}

              {false && payMethod === "crypto" && (
                <>
                  {!cryptoConfigured && (
                    <p className={styles.walletNote}>
                      {en
                        ? "Add CRYPTOMUS_MERCHANT_ID and CRYPTOMUS_PAYMENT_KEY for live crypto."
                        : "Для боевой крипты укажите CRYPTOMUS_MERCHANT_ID и CRYPTOMUS_PAYMENT_KEY."}
                    </p>
                  )}

                  <p className={styles.walletSectionLabel}>
                    {en ? "2. Your wallet" : "2. Ваш кошелёк"}
                  </p>
                  <div className={styles.fcWalletGrid}>
                    {CRYPTO_WALLET_OPTIONS.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        className={
                          walletHint === w.id
                            ? styles.fcWalletOn
                            : styles.fcWallet
                        }
                        onClick={() => setWalletHint(w.id)}
                      >
                        <strong>{en ? w.labelEn : w.labelRu}</strong>
                        <small>{en ? w.descEn : w.descRu}</small>
                      </button>
                    ))}
                  </div>

                  <p className={styles.walletSectionLabel}>
                    {en ? "3. Coin & network" : "3. Монета и сеть"}
                  </p>
                  <div className={styles.fcCoinGrid}>
                    {assets.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={
                          cryptoAsset === a.id
                            ? styles.fcCoinOn
                            : styles.fcCoin
                        }
                        onClick={() => setCryptoAsset(a.id)}
                      >
                        <span className={styles.fcCoinSym}>{a.symbol}</span>
                        <span>
                          <strong>{en ? a.labelEn : a.label}</strong>
                          <small>{a.networkLabel}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedAsset && (
                    <p className={styles.fcAssetHint}>
                      {en ? selectedAsset.hintEn : selectedAsset.hintRu}
                    </p>
                  )}
                </>
              )}

              <p className={styles.walletSectionLabel}>
                {en ? "2. Amount" : "2. Сумма"}
              </p>
              <div className={styles.topupGrid}>
                {topupPresets.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={
                      topupAmount === amount
                        ? styles.walletChipOn
                        : styles.walletChip
                    }
                    onClick={() => setTopupAmount(amount)}
                  >
                    {amount.toLocaleString(loc)} ₽
                  </button>
                ))}
              </div>
              <label className={styles.topupCustom}>
                <span>{en ? "Custom amount" : "Своя сумма"}</span>
                <span className={styles.topupInputWrap}>
                  <input
                    type="number"
                    min={50}
                    max={100000}
                    step={50}
                    inputMode="numeric"
                    value={topupAmount}
                    onChange={(e) =>
                      setTopupAmount(Number(e.target.value) || 50)
                    }
                  />
                  <span className={styles.topupCurrency} aria-hidden>
                    ₽
                  </span>
                </span>
                <span className={styles.fieldHint}>
                  {en ? "Minimum 50 ₽" : "Минимум 50 ₽"}
                </span>
              </label>

              <button
                type="button"
                className={styles.fcPayCta}
                disabled={pending || topupAmount < 50}
                onClick={() => void topUpBalance()}
              >
                {payLabel}
              </button>
          </div>
        </section>

        <div className={styles.fcMid}>
          <section className={styles.fcCard}>
            <h2 className={styles.fcCardTitle}>
              {en ? "Service prices" : "Стоимость услуг"}
            </h2>
            <div className={styles.fcPriceGrid}>
              <div className={styles.fcPrice}>
                <span>{en ? "Post" : "Пост"}</span>
                <strong>{postPriceRub} ₽</strong>
              </div>
              <div className={styles.fcPrice}>
                <span>{en ? "Rewrite" : "Переписать"}</span>
                <strong>{rewritePriceRub} ₽</strong>
              </div>
              <div className={styles.fcPrice}>
                <span>{en ? "Photo" : "Фото"}</span>
                <strong>{imagePriceRub} ₽</strong>
              </div>
              <div className={styles.fcPrice}>
                <span>{en ? "Bot / 30 days" : "Бот / 30 дн."}</span>
                <strong>{botVkPeriodRub} ₽</strong>
              </div>
            </div>
          </section>

          <section className={styles.fcCard}>
            <h2 className={styles.fcCardTitle}>
              {en ? "Quick actions" : "Быстрые действия"}
            </h2>
            <div className={styles.fcQuickGrid}>
              <Link href="/plan?step=drafts" className={styles.fcQuick}>
                <span aria-hidden>✎</span>
                {en ? "Posts" : "Посты"}
              </Link>
              <Link href="/plan?step=brief" className={styles.fcQuick}>
                <span aria-hidden>▦</span>
                {en ? "Brief" : "Бриф"}
              </Link>
              <Link href="/plan?step=bots" className={styles.fcQuick}>
                <span aria-hidden>◎</span>
                {en ? "Bots" : "Боты"}
              </Link>
              <Link href="/plan?step=channels" className={styles.fcQuick}>
                <span aria-hidden>⇄</span>
                {en ? "Channels" : "Каналы"}
              </Link>
            </div>
          </section>
        </div>

        <section className={`${styles.fcCard} ${styles.fcHistory}`}>
          <div className={styles.fcHistoryHead}>
            <div>
              <h2 className={styles.fcCardTitle}>
                {en ? "Transaction history" : "История транзакций"}
              </h2>
              <p className={styles.fcMuted}>
                {en ? "Latest operations" : "Последние операции"}
              </p>
            </div>
          </div>
          {ledger.length === 0 ? (
            <p className={styles.fcMuted}>
              {en ? "No transactions yet." : "Операций пока нет."}
            </p>
          ) : (
            <ul className={styles.fcTxList}>
              {ledger.slice(0, 20).map((row) => {
                const credit = row.amountRub > 0;
                return (
                  <li key={row.id} className={styles.fcTx}>
                    <span
                      className={
                        credit ? styles.fcTxIconIn : styles.fcTxIconOut
                      }
                      aria-hidden
                    >
                      {credit ? "↙" : "↗"}
                    </span>
                    <div className={styles.fcTxMain}>
                      <strong>{row.description}</strong>
                      <time dateTime={row.createdAt}>
                        {new Date(row.createdAt).toLocaleString(loc, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <strong
                      className={
                        credit ? styles.fcTxPlus : styles.fcTxMinus
                      }
                    >
                      {credit ? "+" : ""}
                      {row.amountRub.toLocaleString(loc)} ₽
                    </strong>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
