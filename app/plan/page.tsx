"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BrandBrief, Channel, ContentPlan, PostGoal } from "@/lib/marketer";
import type { PostDraft } from "@/lib/smm/types";
import {
  pickBestSlot,
  slotFromLocalInput,
} from "@/lib/schedule/pick-time";
import {
  AUDIENCE_LANGUAGES,
  BUSINESS_TYPES_I18N,
  WORKING_CHANNELS,
  dict,
  nicheForUi,
  nicheToCanonical,
  type UiLang,
  UI_LANG_KEY,
} from "@/lib/i18n/ui";
import { isValidWebsiteUrl, normalizeWebsiteUrl } from "@/lib/marketer/website";
import styles from "./plan.module.css";

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "telegram", label: "Telegram" },
  { id: "vk", label: "VK" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "threads", label: "Threads" },
  { id: "x", label: "X" },
];

const TIMEZONES = [
  "Europe/Moscow",
  "Europe/Samara",
  "Asia/Yekaterinburg",
  "Asia/Novosibirsk",
  "Asia/Krasnoyarsk",
  "Asia/Irkutsk",
  "Asia/Vladivostok",
  "Asia/Almaty",
  "Asia/Tashkent",
  "Europe/Kyiv",
  "Europe/Minsk",
  "UTC",
];

type Tab = "brief" | "plan" | "drafts" | "channels";

function tabsFor(lang: UiLang): { key: Tab; label: string; short: string }[] {
  const t = dict[lang];
  return [
    { key: "drafts", label: t.tabDrafts, short: t.tabDraftsShort },
    { key: "plan", label: t.tabPlan, short: t.tabPlanShort },
    { key: "brief", label: t.tabBrief, short: t.tabBriefShort },
    { key: "channels", label: t.tabChannels, short: t.tabChannelsShort },
  ];
}

type PublicChannels = {
  telegram: { connected: boolean; chatId?: string; botTokenMasked?: string };
  vk: {
    connected: boolean;
    groupId?: string;
    groupName?: string;
    isStub?: boolean;
    accessTokenMasked?: string;
  };
  facebook: {
    connected: boolean;
    pageId?: string;
    pageName?: string;
    isStub?: boolean;
  };
  instagram: {
    connected: boolean;
    igUserId?: string;
    pageName?: string;
    isStub?: boolean;
  };
  threads: {
    connected: boolean;
    threadsUserId?: string;
    username?: string;
    isStub?: boolean;
  };
  x: { connected: boolean; userId?: string; username?: string; name?: string };
};

type PublicProject = {
  id: string;
  name: string;
  brief: BrandBrief;
  plan: ContentPlan | null;
  planSource: "deepseek" | "local" | null;
  drafts: PostDraft[];
  draftsSource: "deepseek" | "local" | null;
  channels: PublicChannels;
};

function ChannelHelp({
  title,
  steps,
}: {
  title: string;
  steps: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.helpWrap}>
      <button
        type="button"
        className={styles.helpBtn}
        aria-expanded={open}
        aria-label={title}
        title={title}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open && (
        <div className={styles.helpPanel} role="region" aria-label={title}>
          <div className={styles.helpPanelHead}>
            <strong>{title}</strong>
            <button
              type="button"
              className={styles.helpClose}
              onClick={() => setOpen(false)}
            >
              Закрыть
            </button>
          </div>
          <ol className={styles.helpList}>
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

const TELEGRAM_HELP = [
  "Откройте Telegram и найдите бота @BotFather.",
  "Напишите ему команду /newbot и следуйте подсказкам: придумайте имя и username бота.",
  "BotFather пришлёт токен вида 123456789:AAH... — скопируйте его в поле «Токен бота».",
  "Создайте канал или группу, куда будете публиковать посты.",
  "Добавьте своего бота в канал/группу и сделайте его администратором (право публиковать сообщения).",
  "Chat ID: для публичного канала можно указать @имя_канала (например @mychannel).",
  "Если канал/группа приватные: напишите боту @userinfobot или @getidsbot любое сообщение из канала, либо перешлите пост — они покажут числовой ID (часто начинается с -100...).",
  "Вставьте Chat ID в поле ниже и нажмите «Подключить Telegram».",
];

const VK_HELP = [
  "Нажмите «Подключить VK».",
  "Войдите в аккаунт VK и разрешите доступ приложению.",
  "Выберите сообщество, куда публиковать посты — нужны права администратора.",
  "Готово: публикации пойдут на стену выбранного сообщества.",
];

function toggleChannel(list: Channel[], id: Channel): Channel[] {
  if (list.includes(id)) {
    const next = list.filter((c) => c !== id);
    return next.length ? next : list;
  }
  return [...list, id];
}

function statusLabel(status: PostDraft["status"]): string {
  const map: Record<PostDraft["status"], string> = {
    draft: "черновик",
    pending_approval: "ждёт проверки",
    approved: "одобрен",
    scheduled: "запланирован",
    rejected: "отклонён",
    published: "опубликован",
    failed: "ошибка",
  };
  return map[status];
}

/** Старые примеры из value → пусто, чтобы показать placeholder */
const EXAMPLE_VALUES = new Set([
  "услуги",
  "Россия",
  "Ваши клиенты",
  "Мало полезных постов, много рекламы",
  "Интересная лента и понятные предложения",
  "Что вы предлагаете клиентам",
  "Клиенты бренда 25–45",
  "Мало полезного контента, много рекламы",
  "Польза, доверие и понятные офферы",
  "Опишите ваш оффер",
  "понятный",
  "дружелюбный",
]);

function cleanExample(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (EXAMPLE_VALUES.has(v)) return "";
  return value;
}

function briefForForm(brief: BrandBrief): BrandBrief {
  return {
    ...brief,
    brandName:
      brief.brandName.trim() === "Мой бизнес"
        ? ""
        : cleanExample(brief.brandName),
    niche: cleanExample(brief.niche),
    geo: cleanExample(brief.geo),
    offer: cleanExample(brief.offer),
    websiteUrl: brief.websiteUrl?.trim() ?? "",
    toneOfVoice: (brief.toneOfVoice ?? []).filter(
      (t) => !EXAMPLE_VALUES.has(t.trim())
    ),
    audience: {
      who: cleanExample(brief.audience.who),
      pain: cleanExample(brief.audience.pain),
      desire: cleanExample(brief.audience.desire),
    },
  };
}

const ACTIVE_KEY = "smm-agents-active-project";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  balanceRub?: number;
};

export default function PlanPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [step, setStep] = useState<Tab>("drafts");
  const [brief, setBrief] = useState<BrandBrief | null>(null);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [mobileEdit, setMobileEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [trash, setTrash] = useState<
    { id: string; name: string; deletedAt: string; brief: BrandBrief }[]
  >([]);
  const [tgToken, setTgToken] = useState("");
  const [tgChat, setTgChat] = useState("");
  const [vkPickOpen, setVkPickOpen] = useState(false);
  const [vkGroups, setVkGroups] = useState<
    { id: number; name: string; screenName?: string; photo50?: string }[]
  >([]);
  const [vkPickLoading, setVkPickLoading] = useState(false);
  const [vkStubMode, setVkStubMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [uiLang, setUiLang] = useState<UiLang>("ru");
  const [balanceRub, setBalanceRub] = useState(0);
  const [postPriceRub, setPostPriceRub] = useState(50);
  const [topupPresets, setTopupPresets] = useState<number[]>([
    100, 300, 500, 1000, 2000,
  ]);
  const [yookassaConfigured, setYookassaConfigured] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState(500);
  const [ledger, setLedger] = useState<
    {
      id: string;
      type: string;
      amountRub: number;
      balanceAfter: number;
      description: string;
      createdAt: string;
    }[]
  >([]);
  const t = dict[uiLang];
  const TABS = useMemo(() => tabsFor(uiLang), [uiLang]);
  const BUSINESS_TYPES = BUSINESS_TYPES_I18N[uiLang];
  const otherLabel = t.other;

  const refreshBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing");
      if (!res.ok) return;
      const data = await res.json();
      setBalanceRub(Number(data.balanceRub) || 0);
      setPostPriceRub(Number(data.postPriceRub) || 50);
      if (Array.isArray(data.topupPresets)) setTopupPresets(data.topupPresets);
      setYookassaConfigured(Boolean(data.yookassaConfigured));
      setLedger(Array.isArray(data.ledger) ? data.ledger : []);
      setUser((u) =>
        u ? { ...u, balanceRub: Number(data.balanceRub) || 0 } : u
      );
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(UI_LANG_KEY);
    if (saved === "en" || saved === "ru") setUiLang(saved);
  }, []);

  function switchUiLang(next: UiLang) {
    setUiLang(next);
    localStorage.setItem(UI_LANG_KEY, next);
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
  }

  async function topUpBalance(amount: number) {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountRub: amount }),
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
          (uiLang === "en"
            ? `Balance topped up by ${amount} ₽`
            : `Баланс пополнен на ${amount} ₽`)
      );
      await refreshBilling();
      setBillingOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId]
  );

  const selectedDraft = useMemo(() => {
    if (!project?.drafts.length) return null;
    return (
      project.drafts.find((d) => d.id === selectedDraftId) ??
      project.drafts[0] ??
      null
    );
  }, [project, selectedDraftId]);

  const toneText = useMemo(
    () => (brief?.toneOfVoice ?? []).join(", "),
    [brief?.toneOfVoice]
  );

  const refreshProjects = useCallback(async (preferId?: string | null) => {
    const res = await fetch("/api/projects");
    if (res.status === 401) {
      window.location.href = "/login?next=/plan";
      return [];
    }
    const data = await res.json();
    const list = (data.projects ?? []) as PublicProject[];
    setProjects(list);

    const trashRes = await fetch("/api/projects/trash");
    if (trashRes.ok) {
      const trashData = await trashRes.json();
      setTrash(trashData.trash ?? []);
    }

    const saved = preferId ?? localStorage.getItem(ACTIVE_KEY);
    const nextId =
      (saved && list.some((p) => p.id === saved) && saved) ||
      list[0]?.id ||
      null;
    setProjectId(nextId);
    if (nextId) localStorage.setItem(ACTIVE_KEY, nextId);

    const active = list.find((p) => p.id === nextId) ?? null;
    if (active) {
      setBrief(briefForForm(active.brief));
      if (active.drafts?.length) setStep("drafts");
      else if (active.plan) setStep("plan");
      else setStep("brief");
      setSelectedDraftId(active.drafts[0]?.id ?? null);
    } else {
      setBrief(null);
      setStep("brief");
      setSelectedDraftId(null);
    }
    setLoaded(true);
    return list;
  }, []);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d: { user?: AuthUser | null }) => {
        if (!d.user) {
          window.location.href = "/login?next=/plan";
          return;
        }
        setUser(d.user);
        if (typeof d.user.balanceRub === "number") {
          setBalanceRub(d.user.balanceRub);
        }
        return refreshProjects().then(() => refreshBilling());
      })
      .catch(() => setLoaded(true));
  }, [refreshProjects, refreshBilling]);

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    window.location.href = "/";
  }

  useEffect(() => {
    if (!projectId) return;
    localStorage.setItem(ACTIVE_KEY, projectId);
    const p = projects.find((x) => x.id === projectId);
    if (p) setBrief(briefForForm(p.brief));
  }, [projectId, projects]);

  useEffect(() => {
    if (!projectId || step !== "drafts") return;
    void flushDuePosts();
    const timer = window.setInterval(() => {
      void flushDuePosts();
    }, 60_000);
    return () => window.clearInterval(timer);
    // flushDuePosts closes over projectId; re-run when project/step changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, step]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const metaError = params.get("meta_error");
    const metaOk = params.get("meta_ok");
    const metaStub = params.get("meta_stub");
    const vkError = params.get("vk_error");
    const vkPick = params.get("vk_pick");
    const vkStub = params.get("vk_stub");
    const vkProjectId = params.get("projectId");
    const stepParam = params.get("step");
    const billing = params.get("billing");
    if (stepParam === "channels") setStep("channels");
    if (metaError) setError(decodeURIComponent(metaError));
    if (vkError) setError(decodeURIComponent(vkError));
    if (metaOk) {
      setError(null);
      if (metaStub) {
        setNotice(
          `${metaOk === "facebook" ? "Facebook" : metaOk === "instagram" ? "Instagram" : "Threads"} подключён в тестовом режиме (заглушка). Посты не уйдут в реальную сеть.`
        );
      }
      void refreshProjects(projectId);
    }
    if (vkPick === "1") {
      setStep("channels");
      setVkStubMode(vkStub === "1");
      if (vkProjectId) setProjectId(vkProjectId);
      setVkPickOpen(true);
      void loadVkGroups(vkProjectId || projectId || undefined);
    }
    if (billing === "return") {
      const paymentId = localStorage.getItem("smm-agents-pending-payment");
      if (paymentId) {
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
              uiLang === "en"
                ? "Payment checked. Balance updated if payment succeeded."
                : "Платёж проверен. Баланс обновлён, если оплата прошла."
            );
            localStorage.removeItem("smm-agents-pending-payment");
            void refreshBilling();
          })
          .catch(() => void refreshBilling());
      } else {
        void refreshBilling();
      }
    }
    if (metaError || metaOk || vkError || vkPick || stepParam || billing) {
      window.history.replaceState({}, "", "/plan");
    }
  }, [refreshProjects, refreshBilling, projectId, uiLang]);

  async function createNewProject() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim() || "Мой бизнес",
          brief: newName.trim()
            ? { brandName: newName.trim() }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не создано");
      setNewName("");
      await refreshProjects(data.project.id);
      setStep("brief");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  function briefPayload(): BrandBrief {
    if (!brief) throw new Error("no brief");
    const postsPerDay = Math.min(
      5,
      Math.max(
        1,
        brief.postsPerDay ??
          (Math.round((brief.postsPerWeek || 7) / 7) || 1)
      )
    );
    return {
      ...brief,
      postsPerDay,
      postsPerWeek: postsPerDay * 7,
      channels: brief.channels.filter((c) => WORKING_CHANNELS.has(c)),
      websiteUrl: normalizeWebsiteUrl(brief.websiteUrl ?? ""),
    };
  }

  async function saveBrief() {
    if (!projectId || !brief) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: briefPayload().brandName, brief: briefPayload() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не сохранено");
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? data.project : p))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function generatePlan() {
    if (!projectId || !brief) return;
    setPending(true);
    setError(null);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: briefPayload().brandName, brief: briefPayload() }),
      });
      const res = await fetch(`/api/projects/${projectId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: briefPayload() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setBillingOpen(true);
          if (typeof data.balanceRub === "number") setBalanceRub(data.balanceRub);
        }
        throw new Error(data.error || "Не удалось собрать план");
      }
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? data.project : p))
      );
      setBrief(briefForForm(data.project.brief));
      if (data.billing?.chargedRub) {
        setNotice(
          uiLang === "en"
            ? `Charged ${data.billing.chargedRub} ₽ for ${data.billing.postsCount} posts. Balance: ${data.billing.balanceRub} ₽`
            : `Списано ${data.billing.chargedRub} ₽ за ${data.billing.postsCount} постов. Баланс: ${data.billing.balanceRub} ₽`
        );
        setBalanceRub(data.billing.balanceRub);
      }
      void refreshBilling();
      setStep("plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function generateDrafts() {
    if (!projectId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/posts`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось написать посты");
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? data.project : p))
      );
      setSelectedDraftId(data.project?.drafts?.[0]?.id ?? null);
      setStep("drafts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function updatePlanPostTime(
    postId: string,
    day: string,
    timeLocal: string
  ) {
    if (!projectId) return;
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, day, timeLocal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось изменить время");
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? data.project : p))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function generateDraftImage(draftId: string) {
    if (!projectId) return;
    setBusyId(draftId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/drafts/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось сгенерировать фото");
      }
      if (data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  }

  function draftImageSrc(draft: PostDraft): string | null {
    if (!projectId || !draft.imagePath) return null;
    const file = draft.imagePath.split("/").pop();
    if (!file) return null;
    return `/api/projects/${projectId}/media/${file}`;
  }

  async function persistDrafts(drafts: PostDraft[]) {
    if (!projectId) return;
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, drafts } : p))
    );
    await fetch(`/api/projects/${projectId}/drafts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drafts }),
    });
  }

  function updateDraft(id: string, patch: Partial<PostDraft>) {
    if (!project) return;
    const drafts = project.drafts.map((d) =>
      d.id === id ? { ...d, ...patch } : d
    );
    void persistDrafts(drafts);
  }

  function applySchedule(
    draft: PostDraft,
    day: string,
    timeLocal: string,
    why?: string
  ) {
    if (!brief) return;
    const slot = slotFromLocalInput({
      day,
      timeLocal,
      timeZone: brief.timezone,
      channel: draft.channel,
    });
    updateDraft(draft.id, {
      day: slot.day,
      timeLocal: slot.timeLocal,
      scheduledAtIso: slot.scheduledAtIso,
      weekday: slot.weekday,
      scheduleWhy: why || slot.why,
    });
  }

  function pickTimeForDraft(draft: PostDraft) {
    if (!brief || !project) return;
    const taken = new Set(
      project.drafts
        .filter((d) => d.id !== draft.id)
        .map((d) => `${d.channel}:${d.day}:${Number(d.timeLocal.slice(0, 2))}`)
    );
    const slot = pickBestSlot({
      channel: draft.channel,
      day: draft.day,
      timeZone: brief.timezone,
      takenHours: taken,
      goal: draft.goal as PostGoal,
      format: draft.format as
        | "text"
        | "text_image"
        | "poll"
        | "carousel"
        | "short_video",
      postIndex: project.drafts.findIndex((d) => d.id === draft.id),
    });
    updateDraft(draft.id, {
      day: slot.day,
      timeLocal: slot.timeLocal,
      scheduledAtIso: slot.scheduledAtIso,
      weekday: slot.weekday,
      scheduleWhy: slot.why,
      status:
        draft.status === "published" || draft.status === "rejected"
          ? draft.status
          : "approved",
    });
  }

  function scheduleDraft(draft: PostDraft) {
    if (!brief || !project) return;
    setError(null);

    let patch: Partial<PostDraft> = {
      status: "scheduled",
      publishError: undefined,
    };

    if (!draft.scheduledAtIso) {
      const taken = new Set(
        project.drafts
          .filter((d) => d.id !== draft.id)
          .map(
            (d) => `${d.channel}:${d.day}:${Number(d.timeLocal.slice(0, 2))}`
          )
      );
      const slot = pickBestSlot({
        channel: draft.channel,
        day: draft.day,
        timeZone: brief.timezone,
        takenHours: taken,
        goal: draft.goal as PostGoal,
        format: draft.format as
        | "text"
        | "text_image"
        | "poll"
        | "carousel"
        | "short_video",
        postIndex: project.drafts.findIndex((d) => d.id === draft.id),
      });
      patch = {
        ...patch,
        day: slot.day,
        timeLocal: slot.timeLocal,
        scheduledAtIso: slot.scheduledAtIso,
        weekday: slot.weekday,
        scheduleWhy: slot.why,
      };
    }

    updateDraft(draft.id, patch);
  }

  async function flushDuePosts() {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/publish-due`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
      }
    } catch {
      /* ignore */
    }
  }

  async function publishDraft(draft: PostDraft) {
    if (!projectId) return;
    const channel = draft.channel;
    if (
      channel !== "telegram" &&
      channel !== "vk" &&
      channel !== "facebook" &&
      channel !== "instagram" &&
      channel !== "threads" &&
      channel !== "x"
    ) {
      setError("Неизвестный канал публикации");
      return;
    }
    setBusyId(draft.id);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, channel }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        updateDraft(draft.id, {
          status: "failed",
          publishError: data.error || "Ошибка публикации",
        });
        throw new Error(data.error || "Ошибка публикации");
      }
      if (data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  }

  async function generateDraftVideo(draftId: string) {
    if (!projectId) return;
    setBusyId(draftId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/drafts/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось сгенерировать видео");
      }
      if (data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  }

  async function loadVkGroups(forProjectId?: string) {
    const pid = forProjectId || projectId;
    if (!pid) return;
    setVkPickLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vk/groups?projectId=${pid}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить сообщества");
      setVkGroups(data.groups ?? []);
      setVkStubMode(Boolean(data.stub));
      setVkPickOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка VK");
      setVkPickOpen(false);
    } finally {
      setVkPickLoading(false);
    }
  }

  function startVkOAuth() {
    if (!projectId) return;
    window.location.href = `/api/vk/start?projectId=${encodeURIComponent(projectId)}`;
  }

  async function connectVkGroup(groupId: number) {
    if (!projectId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/vk/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, groupId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не подключено");
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? data.project : p))
      );
      setVkPickOpen(false);
      setVkGroups([]);
      if (data.stub) {
        setNotice(
          uiLang === "en"
            ? "VK connected in demo mode (stub). Posts will not go to a real community."
            : "VK подключён в тестовом режиме (заглушка). Посты не уйдут в реальное сообщество."
        );
      } else {
        setNotice(
          uiLang === "en" ? "VK community connected." : "Сообщество VK подключено."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function connectTelegram() {
    if (!projectId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/channels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "telegram",
          botToken: tgToken,
          chatId: tgChat,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не подключено");
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? data.project : p))
      );
      setTgToken("");
      setTgChat("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function disconnectChannel(
    channel: "telegram" | "vk" | "facebook" | "instagram" | "threads" | "x"
  ) {
    if (!projectId) return;
    const res = await fetch(
      `/api/projects/${projectId}/channels?channel=${channel}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    if (res.ok) {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? data.project : p))
      );
    }
  }

  async function removeProject() {
    if (!projectId || !project) return;
    const typed = deleteConfirm.trim();
    if (typed !== project.name.trim()) {
      setError(`Введите точное название «${project.name}» для удаления`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: typed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалено");
      setDeleteOpen(false);
      setDeleteConfirm("");
      localStorage.removeItem(ACTIVE_KEY);
      await refreshProjects(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function restoreFromTrash(id: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не восстановлено");
      await refreshProjects(data.project?.id);
      setStep("brief");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  if (!loaded) {
    return (
      <main className={styles.page}>
        <div className={`container ${styles.layout}`}>
          <p className={styles.lead}>{t.loading}</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div className={`container ${styles.topInner}`}>
          <Link href="/" className={styles.logo}>
            SMM-Agents
          </Link>
          <div className={styles.projectBar}>
            <div className={styles.langSwitch} role="group" aria-label={t.uiLang}>
              <button
                type="button"
                className={uiLang === "ru" ? styles.langOn : styles.langBtn}
                onClick={() => switchUiLang("ru")}
              >
                RU
              </button>
              <button
                type="button"
                className={uiLang === "en" ? styles.langOn : styles.langBtn}
                onClick={() => switchUiLang("en")}
              >
                EN
              </button>
            </div>
            <button
              type="button"
              className={styles.balanceChip}
              onClick={() => {
                setBillingOpen(true);
                void refreshBilling();
              }}
              title={
                uiLang === "en"
                  ? "Top up balance"
                  : "Пополнить баланс"
              }
            >
              <span className={styles.balanceLabel}>
                {uiLang === "en" ? "Balance" : "Баланс"}
              </span>
              <strong>{balanceRub.toLocaleString(uiLang === "en" ? "en-US" : "ru-RU")} ₽</strong>
            </button>
            {user && (
              <span className={styles.userChip}>
                {user.name}
                <button type="button" onClick={logout}>
                  {t.logout}
                </button>
              </span>
            )}
          </div>
        </div>
      </header>

      {!project || !brief ? (
        <div className={`container ${styles.layout}`}>
          <section className={`${styles.panel} ${styles.wide}`}>
            <h1 className={styles.title}>{t.cabinetTitle}</h1>
            <p className={styles.lead}>{t.cabinetLead}</p>
            <div className={styles.createRow}>
              <input
                className={styles.createInput}
                placeholder={t.businessNamePh}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                disabled={pending}
                onClick={createNewProject}
              >
                {t.createBusiness}
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            {trash.length > 0 && (
              <div className={styles.trashBox}>
                <p className={styles.bizLabel}>{t.trash}</p>
                {trash.map((item) => (
                  <div key={item.id} className={styles.trashRow}>
                    <div>
                      <strong>{item.name}</strong>
                      <span className={styles.cellSub}>
                        {t.deleted}{" "}
                        {new Date(item.deletedAt).toLocaleString(
                          uiLang === "en" ? "en-US" : "ru-RU"
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={pending}
                      onClick={() => restoreFromTrash(item.id)}
                    >
                      {t.restore}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <>
          <div className={`container ${styles.workspace}`}>
            <div className={styles.bizSwitch}>
              <p className={styles.bizLabel}>{t.business}</p>
              <div className={styles.bizList}>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={
                      p.id === projectId ? styles.bizOn : styles.bizChip
                    }
                    onClick={() => {
                      setProjectId(p.id);
                      localStorage.setItem(ACTIVE_KEY, p.id);
                      setSelectedDraftId(p.drafts[0]?.id ?? null);
                      if (p.drafts.length) setStep("drafts");
                      else if (p.plan) setStep("plan");
                      else setStep("brief");
                    }}
                  >
                    <span className={styles.bizName}>{p.name}</span>
                    <span className={styles.bizNiche}>
                      {p.brief.niche
                        ? nicheForUi(p.brief.niche, uiLang)
                        : t.noNiche}
                    </span>
                  </button>
                ))}
              </div>
              <div className={styles.createRowCompact}>
                <input
                  className={styles.createInput}
                  placeholder={t.newBusiness}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pending}
                  onClick={createNewProject}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className={`container ${styles.stepsWrap}`}>
            <div className={`${styles.stepsNav} ${styles.desktopOnly}`}>
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={step === key ? styles.stepOn : styles.step}
                  onClick={() => {
                    setStep(key);
                    setMobileEdit(false);
                  }}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className={styles.stepDanger}
                onClick={() => {
                  setDeleteOpen(true);
                  setDeleteConfirm("");
                  setError(null);
                }}
              >
                {t.delete}
              </button>
            </div>
            <div className={styles.dashMeta}>
              <span>
                <strong>{project.name}</strong>
              </span>
              <span className={styles.hideXs}>
                {brief.niche
                  ? nicheForUi(brief.niche, uiLang)
                  : t.nicheNotSet}
              </span>
              <span className={styles.hideXs}>{brief.timezone}</span>
              <span>
                TG {project.channels.telegram.connected ? "✓" : "—"}
              </span>
              <span>VK {project.channels.vk.connected ? "✓" : "—"}</span>
            </div>
          </div>

          <div className={`container ${styles.layout}`}>
            {step === "brief" && (
              <section className={`${styles.panel} ${styles.wide}`}>
                <p className="eyebrow">
                  {t.briefEyebrow} · {project.name}
                </p>
                <h1 className={styles.title}>{t.briefTitle}</h1>
                <p className={styles.lead}>{t.briefLead}</p>
                {trash.length > 0 && (
                  <div className={styles.trashBox}>
                    <p className={styles.bizLabel}>{t.trash}</p>
                    {trash.map((item) => (
                      <div key={item.id} className={styles.trashRow}>
                        <div>
                          <strong>{item.name}</strong>
                          <span className={styles.cellSub}>
                            {t.deleted}{" "}
                            {new Date(item.deletedAt).toLocaleString(
                              uiLang === "en" ? "en-US" : "ru-RU"
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={pending}
                          onClick={() => restoreFromTrash(item.id)}
                        >
                          {t.restore}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {!project.plan && !project.drafts.length && (
                  <p className={styles.scheduleNote}>
                    {uiLang === "en"
                      ? "Plan and texts need to be rebuilt. Previously generated media may remain — regenerate after rebuild. Reconnect Telegram/VK in Channels."
                      : "План и тексты нужно собрать заново. Ранее сгенерированные фото в папке медиа сохранились — после сборки можно перегенерировать. Telegram/VK подключите снова в «Каналы»."}
                  </p>
                )}

                <div className={styles.form}>
                  <label>
                    {t.brandName}
                    <input
                      value={brief.brandName}
                      onChange={(e) =>
                        setBrief({ ...brief, brandName: e.target.value })
                      }
                      placeholder={t.brandNamePh}
                    />
                  </label>
                  <label className={styles.full}>
                    {t.businessType}
                    <div className={styles.typeGrid}>
                      {BUSINESS_TYPES.map((type) => {
                        const displayNiche = nicheForUi(brief.niche, uiLang);
                        const active =
                          displayNiche === type ||
                          (type === otherLabel &&
                            brief.niche !== "" &&
                            !BUSINESS_TYPES.includes(displayNiche) &&
                            !BUSINESS_TYPES_I18N.ru.includes(brief.niche) &&
                            !BUSINESS_TYPES_I18N.en.includes(brief.niche));
                        return (
                          <button
                            key={type}
                            type="button"
                            className={
                              active ? styles.typeOn : styles.typeChip
                            }
                            onClick={() =>
                              setBrief({
                                ...brief,
                                niche:
                                  type === otherLabel
                                    ? ""
                                    : nicheToCanonical(type),
                              })
                            }
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                  <label className={styles.full}>
                    {t.nicheCustom}
                    <input
                      value={
                        BUSINESS_TYPES_I18N.ru.includes(brief.niche) ||
                        BUSINESS_TYPES_I18N.en.includes(brief.niche)
                          ? ""
                          : brief.niche
                      }
                      onChange={(e) =>
                        setBrief({ ...brief, niche: e.target.value })
                      }
                      placeholder={t.nichePh}
                    />
                  </label>
                  <label>
                    {t.timezone}
                    <select
                      value={brief.timezone}
                      onChange={(e) =>
                        setBrief({ ...brief, timezone: e.target.value })
                      }
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.audienceLang}
                    <select
                      value={brief.language || "ru"}
                      onChange={(e) =>
                        setBrief({ ...brief, language: e.target.value })
                      }
                    >
                      {AUDIENCE_LANGUAGES.map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {uiLang === "en" ? lang.labelEn : lang.labelRu}
                        </option>
                      ))}
                    </select>
                    <span className={styles.fieldHint}>{t.audienceLangHint}</span>
                  </label>
                  <div className={`${styles.full} ${styles.freqCard}`}>
                    <div className={styles.freqHead}>
                      <div>
                        <p className={styles.freqTitle}>{t.freqTitle}</p>
                        <p className={styles.fieldHint}>{t.postsPerDayHint}</p>
                      </div>
                      <div className={styles.freqSummary}>
                        <span>
                          <strong>
                            {brief.postsPerDay ??
                              Math.max(
                                1,
                                Math.round((brief.postsPerWeek || 7) / 7)
                              )}
                          </strong>{" "}
                          {t.freqPerDay}
                        </span>
                        <span>
                          <strong>{brief.postsPerWeek}</strong> {t.freqPerWeek}
                        </span>
                        <span>
                          <strong>
                            {(brief.postsPerWeek * postPriceRub).toLocaleString(
                              uiLang === "en" ? "en-US" : "ru-RU"
                            )}{" "}
                            ₽
                          </strong>{" "}
                          {t.freqCost}
                        </span>
                      </div>
                    </div>
                    <div className={styles.freqPresets} role="group" aria-label={t.postsPerDay}>
                      {[
                        { day: 1, label: t.freqPresetLight },
                        { day: 2, label: t.freqPresetNorm },
                        { day: 3, label: t.freqPresetActive },
                        { day: 5, label: t.freqPresetHot },
                      ].map(({ day, label }) => {
                        const active =
                          (brief.postsPerDay ??
                            Math.max(
                              1,
                              Math.round((brief.postsPerWeek || 7) / 7)
                            )) === day;
                        const week = day * 7;
                        const cost = week * postPriceRub;
                        return (
                          <button
                            key={day}
                            type="button"
                            className={
                              active ? styles.freqPresetOn : styles.freqPreset
                            }
                            onClick={() =>
                              setBrief({
                                ...brief,
                                postsPerDay: day,
                                postsPerWeek: week,
                              })
                            }
                          >
                            <span className={styles.freqPresetLabel}>{label}</span>
                            <span className={styles.freqPresetMain}>
                              {day} {t.freqPerDay}
                            </span>
                            <span className={styles.freqPresetSub}>
                              {week} {t.freqPerWeek} · {cost} ₽
                            </span>
                            <span className={styles.freqDots} aria-hidden>
                              {Array.from({ length: day }).map((_, i) => (
                                <i key={i} />
                              ))}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className={styles.freqWeek} aria-hidden>
                      {(uiLang === "en"
                        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                        : ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
                      ).map((d) => {
                        const n =
                          brief.postsPerDay ??
                          Math.max(1, Math.round((brief.postsPerWeek || 7) / 7));
                        return (
                          <div key={d} className={styles.freqDay}>
                            <span>{d}</span>
                            <div className={styles.freqDayDots}>
                              {Array.from({ length: n }).map((_, i) => (
                                <i key={i} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p
                      className={
                        balanceRub >= brief.postsPerWeek * postPriceRub
                          ? styles.freqOk
                          : styles.freqWarn
                      }
                    >
                      {balanceRub >= brief.postsPerWeek * postPriceRub
                        ? `${t.freqEnough} · ${balanceRub.toLocaleString(uiLang === "en" ? "en-US" : "ru-RU")} ₽`
                        : `${t.freqNeedTopup}: ${(brief.postsPerWeek * postPriceRub - balanceRub).toLocaleString(uiLang === "en" ? "en-US" : "ru-RU")} ₽`}
                    </p>
                  </div>
                  <label>
                    {t.startDate}
                    <input
                      type="date"
                      value={brief.startDate}
                      onChange={(e) =>
                        setBrief({ ...brief, startDate: e.target.value })
                      }
                    />
                  </label>
                  <label className={styles.full}>
                    {t.offer}
                    <input
                      value={brief.offer}
                      onChange={(e) =>
                        setBrief({ ...brief, offer: e.target.value })
                      }
                      placeholder={t.offerPh}
                    />
                  </label>
                  <label className={styles.full}>
                    {t.websiteUrl}
                    <input
                      type="url"
                      inputMode="url"
                      value={brief.websiteUrl ?? ""}
                      onChange={(e) =>
                        setBrief({ ...brief, websiteUrl: e.target.value })
                      }
                      placeholder={t.websiteUrlPh}
                    />
                    <span className={styles.fieldHint}>{t.websiteUrlHint}</span>
                    {brief.websiteUrl?.trim() &&
                      !isValidWebsiteUrl(brief.websiteUrl) && (
                        <span className={styles.fieldHint}>{t.websiteUrlInvalid}</span>
                      )}
                  </label>
                  <label className={styles.full}>
                    {t.tone}
                    <input
                      value={toneText}
                      onChange={(e) =>
                        setBrief({
                          ...brief,
                          toneOfVoice: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder={t.tonePh}
                    />
                  </label>
                  <label className={styles.full}>
                    {t.audienceWho}
                    <input
                      value={brief.audience.who}
                      onChange={(e) =>
                        setBrief({
                          ...brief,
                          audience: { ...brief.audience, who: e.target.value },
                        })
                      }
                      placeholder={t.audienceWhoPh}
                    />
                  </label>
                  <label className={styles.full}>
                    {t.audiencePain}
                    <input
                      value={brief.audience.pain}
                      onChange={(e) =>
                        setBrief({
                          ...brief,
                          audience: { ...brief.audience, pain: e.target.value },
                        })
                      }
                      placeholder={t.audiencePainPh}
                    />
                  </label>
                  <label className={styles.full}>
                    {t.audienceDesire}
                    <input
                      value={brief.audience.desire}
                      onChange={(e) =>
                        setBrief({
                          ...brief,
                          audience: {
                            ...brief.audience,
                            desire: e.target.value,
                          },
                        })
                      }
                      placeholder={t.audienceDesirePh}
                    />
                  </label>
                  <fieldset className={styles.full}>
                    <legend>{t.publishWhere}</legend>
                    <div className={styles.channels}>
                      {CHANNELS.map((ch) => {
                        const working = WORKING_CHANNELS.has(ch.id);
                        const active = brief.channels.includes(ch.id);
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            disabled={!working}
                            className={
                              !working
                                ? styles.chipSoon
                                : active
                                  ? styles.chipOn
                                  : styles.chip
                            }
                            onClick={() => {
                              if (!working) return;
                              setBrief({
                                ...brief,
                                channels: toggleChannel(brief.channels, ch.id),
                              });
                            }}
                          >
                            {ch.label}
                            {!working && (
                              <span className={styles.soonTag}>{t.soon}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>

                {error && <p className={styles.error}>{error}</p>}
                {notice && <p className={styles.notice}>{notice}</p>}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={pending}
                    onClick={saveBrief}
                  >
                    {t.save}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={pending}
                    onClick={() => {
                      if (balanceRub < brief.postsPerWeek * postPriceRub) {
                        setBillingOpen(true);
                        setError(
                          uiLang === "en"
                            ? `Need ${brief.postsPerWeek * postPriceRub} ₽, balance ${balanceRub} ₽`
                            : `Нужно ${brief.postsPerWeek * postPriceRub} ₽, на балансе ${balanceRub} ₽`
                        );
                        return;
                      }
                      void generatePlan();
                    }}
                  >
                    {pending
                      ? t.makingPlan
                      : `${t.makePlan} · ${brief.postsPerWeek * postPriceRub} ₽`}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setBillingOpen(true);
                      void refreshBilling();
                    }}
                  >
                    {uiLang === "en" ? "Top up" : "Пополнить"}
                  </button>
                  <button
                    type="button"
                    className={`${styles.stepDanger} ${styles.mobileOnly}`}
                    onClick={() => {
                      setDeleteOpen(true);
                      setDeleteConfirm("");
                      setError(null);
                    }}
                  >
                    {t.deleteBusiness}
                  </button>
                </div>
              </section>
            )}

            {step === "plan" && !project.plan && (
              <section className={`${styles.panel} ${styles.wide}`}>
                <p className="eyebrow">Расписание</p>
                <h1 className={styles.title}>Плана пока нет</h1>
                <p className={styles.lead}>
                  Заполните профиль бизнеса и нажмите «Составить план» —
                  маркетолог сам расставит время.
                </p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setStep("brief")}
                >
                  К профилю бизнеса
                </button>
              </section>
            )}

            {step === "plan" && project.plan && (
              <>
                <section className={styles.panel}>
                  <p className="eyebrow">
                    Расписание
                    {project.planSource === "deepseek"
                      ? " · с помощью ИИ"
                      : " · базовый режим"}
                  </p>
                  <h1 className={styles.title}>{project.plan.brandName}</h1>
                  <p className={styles.lead}>
                    {project.plan.period.from} — {project.plan.period.to}
                    <br />
                    {project.plan.summary.totalPosts} постов · маркетолог уже
                    подобрал время по поясу{" "}
                    <strong>{project.plan.timezone}</strong>. Ниже можно
                    изменить дату и час.
                  </p>
                  <ul className={styles.notes}>
                    {project.plan.strategyNotes.slice(0, 4).map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                  {error && <p className={styles.error}>{error}</p>}
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setStep("brief")}
                    >
                      Изменить анкету
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={pending}
                      onClick={generateDrafts}
                    >
                      {pending ? "Пишем тексты и фото…" : "Собрать тексты и фото"}
                    </button>
                  </div>
                </section>
                <section className={styles.result}>
                  <div className={styles.calendar}>
                    {project.plan.posts.map((post) => (
                      <article key={post.id} className={styles.post}>
                        <header>
                          <span className={styles.when}>
                            {post.weekday}, {post.day} · {post.timeLocal} (
                            {project.plan!.timezone})
                          </span>
                          <span className={styles.channel}>{post.channel}</span>
                        </header>
                        <h3>{post.topic}</h3>
                        <p className={styles.hook}>{post.hook}</p>
                        <div className={styles.scheduleRow}>
                          <label>
                            Дата
                            <input
                              type="date"
                              value={post.day}
                              onChange={(e) =>
                                void updatePlanPostTime(
                                  post.id,
                                  e.target.value,
                                  post.timeLocal
                                )
                              }
                            />
                          </label>
                          <label>
                            Время
                            <input
                              type="time"
                              value={post.timeLocal.slice(0, 5)}
                              onChange={(e) =>
                                void updatePlanPostTime(
                                  post.id,
                                  post.day,
                                  e.target.value
                                )
                              }
                            />
                          </label>
                        </div>
                        <p className={styles.why}>
                          <strong>Почему это время:</strong> {post.whyThisTime}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}

            {step === "drafts" && (
              <section className={`${styles.result} ${styles.wide}`}>
                <div className={styles.summary}>
                  <div>
                    <p className="eyebrow">
                      Контент
                      {project.draftsSource === "deepseek"
                        ? " · ИИ"
                        : project.drafts.length
                          ? " · шаблон"
                          : ""}
                    </p>
                    <h2>Лента публикаций</h2>
                    <p>
                      Маркетолог сам решает, нужно ли фото, и создаёт его при
                      сборке. Выберите строку — справа правки.{" "}
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => setStep("channels")}
                      >
                        Каналы
                      </button>
                    </p>
                  </div>
                  <div className={styles.summaryActions}>
                    {project.plan && (
                      <button
                        type="button"
                        className="btn"
                        disabled={pending}
                        onClick={generateDrafts}
                      >
                        {pending
                          ? "Собираем…"
                          : project.drafts.length
                            ? "Пересобрать тексты"
                            : "Собрать тексты"}
                      </button>
                    )}
                  </div>
                </div>
                {error && <p className={styles.error}>{error}</p>}

                {!project.drafts.length ? (
                  <div className={styles.emptyDash}>
                    {!project.plan ? (
                      <>
                        <p>Сначала нужен план на неделю.</p>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setStep("brief")}
                        >
                          Открыть профиль бизнеса
                        </button>
                      </>
                    ) : (
                      <>
                        <p>План есть — соберите тексты одним нажатием.</p>
                        <button
                          type="button"
                          className="btn"
                          disabled={pending}
                          onClick={generateDrafts}
                        >
                          {pending
                            ? "Пишем тексты и фото…"
                            : "Собрать тексты и фото"}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    className={`${styles.contentGrid} ${
                      mobileEdit ? styles.contentEditing : ""
                    }`}
                  >
                    <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
                      <table className={styles.contentTable}>
                        <thead>
                          <tr>
                            <th>Когда</th>
                            <th>Канал</th>
                            <th>Тема</th>
                            <th>Фото</th>
                            <th>Статус</th>
                          </tr>
                        </thead>
                        <tbody>
                          {project.drafts.map((draft) => {
                            const active =
                              (selectedDraft?.id ?? null) === draft.id;
                            return (
                              <tr
                                key={draft.id}
                                className={
                                  active ? styles.rowActive : undefined
                                }
                                onClick={() => setSelectedDraftId(draft.id)}
                              >
                                <td>
                                  <div className={styles.cellMain}>
                                    {draft.day}
                                  </div>
                                  <div className={styles.cellSub}>
                                    {draft.timeLocal.slice(0, 5)} ·{" "}
                                    {draft.weekday}
                                  </div>
                                </td>
                                <td>{draft.channel}</td>
                                <td>
                                  <div className={styles.cellMain}>
                                    {draft.title || draft.topic}
                                  </div>
                                  <div className={styles.cellSub}>
                                    {draft.topic}
                                  </div>
                                </td>
                                <td>
                                  {draft.imagePath
                                    ? "есть"
                                    : draft.needsPhoto
                                      ? "нужно"
                                      : "нет"}
                                </td>
                                <td>
                                  <span
                                    className={styles.status}
                                    data-status={draft.status}
                                  >
                                    {statusLabel(draft.status)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className={`${styles.mobileList} ${styles.mobileOnly}`}>
                      {project.drafts.map((draft) => {
                        const active =
                          (selectedDraft?.id ?? null) === draft.id;
                        return (
                          <button
                            key={draft.id}
                            type="button"
                            className={
                              active ? styles.mobileCardOn : styles.mobileCard
                            }
                            onClick={() => {
                              setSelectedDraftId(draft.id);
                              setMobileEdit(true);
                            }}
                          >
                            <div className={styles.mobileCardTop}>
                              <span>
                                {draft.day.slice(5)} ·{" "}
                                {draft.timeLocal.slice(0, 5)}
                              </span>
                              <span
                                className={styles.status}
                                data-status={draft.status}
                              >
                                {statusLabel(draft.status)}
                              </span>
                            </div>
                            <strong className={styles.mobileCardTitle}>
                              {draft.title || draft.topic}
                            </strong>
                            <div className={styles.mobileCardMeta}>
                              <span>{draft.channel}</span>
                              <span>
                                {draft.imagePath
                                  ? "фото есть"
                                  : draft.needsPhoto
                                    ? "нужно фото"
                                    : "без фото"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedDraft && (
                      <aside
                        className={`${styles.draftPanel} ${
                          mobileEdit ? styles.draftPanelOpen : ""
                        }`}
                      >
                        {(() => {
                          const draft = selectedDraft;
                          const canAutoPublish =
                            draft.channel === "telegram" ||
                            draft.channel === "vk" ||
                            draft.channel === "facebook" ||
                            draft.channel === "instagram" ||
                            draft.channel === "threads" ||
                            draft.channel === "x";
                          const locked = draft.status === "published";
                          return (
                            <>
                              <header className={styles.draftPanelHead}>
                                <div>
                                  <button
                                    type="button"
                                    className={`${styles.backMobile} ${styles.mobileOnly}`}
                                    onClick={() => setMobileEdit(false)}
                                  >
                                    ← К списку
                                  </button>
                                  <p className="eyebrow">{draft.channel}</p>
                                  <h3>{draft.topic}</h3>
                                </div>
                                <span
                                  className={styles.status}
                                  data-status={draft.status}
                                >
                                  {statusLabel(draft.status)}
                                </span>
                              </header>

                              <label className={styles.field}>
                                <span className={styles.fieldLabel}>Заголовок</span>
                                <input
                                  className={styles.fieldControl}
                                  value={draft.title}
                                  disabled={locked}
                                  onChange={(e) =>
                                    updateDraft(draft.id, {
                                      title: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label className={styles.field}>
                                <span className={styles.fieldLabel}>Текст</span>
                                <textarea
                                  className={styles.fieldControl}
                                  rows={8}
                                  value={draft.body}
                                  disabled={locked}
                                  onChange={(e) =>
                                    updateDraft(draft.id, {
                                      body: e.target.value,
                                    })
                                  }
                                />
                              </label>

                              <div className={styles.scheduleRow}>
                                <label className={styles.field}>
                                  <span className={styles.fieldLabel}>Дата</span>
                                  <input
                                    className={styles.fieldControl}
                                    type="date"
                                    value={draft.day}
                                    disabled={locked}
                                    onChange={(e) =>
                                      applySchedule(
                                        draft,
                                        e.target.value,
                                        draft.timeLocal
                                      )
                                    }
                                  />
                                </label>
                                <label className={styles.field}>
                                  <span className={styles.fieldLabel}>Время</span>
                                  <input
                                    className={styles.fieldControl}
                                    type="time"
                                    value={draft.timeLocal.slice(0, 5)}
                                    disabled={locked}
                                    onChange={(e) =>
                                      applySchedule(
                                        draft,
                                        draft.day,
                                        e.target.value
                                      )
                                    }
                                  />
                                </label>
                              </div>

                              <div className={styles.imageBlock}>
                                {draftImageSrc(draft) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={draftImageSrc(draft)!}
                                    alt=""
                                    className={styles.draftImage}
                                  />
                                ) : (
                                  <p className={styles.scheduleNote}>
                                    {draft.channel === "threads"
                                      ? "Threads: только текст, без фото"
                                      : draft.channel === "instagram"
                                        ? draft.imagePath
                                          ? "Instagram: фото + текст в описании"
                                          : "Instagram: нужно фото для публикации"
                                        : draft.needsPhoto
                                          ? "Маркетолог отметил фото — можно создать или пересобрать контент"
                                          : "Фото не нужно"}
                                  </p>
                                )}
                                {(draft.channel !== "threads" &&
                                  (draft.needsPhoto || draft.imagePath)) && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    disabled={locked || busyId === draft.id}
                                    onClick={() =>
                                      generateDraftImage(draft.id)
                                    }
                                  >
                                    {busyId === draft.id
                                      ? "Генерируем…"
                                      : draft.imagePath
                                        ? "Новое фото"
                                        : "Создать фото"}
                                  </button>
                                )}
                                {draft.channel !== "threads" &&
                                  draft.channel !== "instagram" && (
                                    <button
                                      type="button"
                                      className="btn btn-ghost"
                                      disabled={locked || busyId === draft.id}
                                      onClick={() =>
                                        generateDraftVideo(draft.id)
                                      }
                                    >
                                      {busyId === draft.id
                                        ? "Генерируем…"
                                        : draft.videoPath
                                          ? "Новое видео"
                                          : "Сгенерировать видео"}
                                    </button>
                                  )}
                                {draft.videoPath && (
                                  <p className={styles.scheduleNote}>
                                    Видео готово — уйдёт в X / TG / VK при
                                    публикации, если канал поддерживает.
                                  </p>
                                )}
                              </div>

                              {draft.publishError && (
                                <p className={styles.error}>
                                  {draft.publishError}
                                </p>
                              )}

                              <div className={styles.draftActionsSticky}>
                                <button
                                  type="button"
                                  className="btn"
                                  disabled={locked}
                                  onClick={() => scheduleDraft(draft)}
                                >
                                  {draft.status === "scheduled"
                                    ? "В расписании"
                                    : "Запланировать"}
                                </button>
                                {canAutoPublish && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    disabled={busyId === draft.id || locked}
                                    onClick={() => publishDraft(draft)}
                                  >
                                    Сейчас
                                  </button>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </aside>
                    )}
                  </div>
                )}
              </section>
            )}

            {step === "channels" && (
              <section className={`${styles.panel} ${styles.wide}`}>
                <p className="eyebrow">{t.channelsEyebrow}</p>
                <h1 className={styles.title}>{t.channelsTitle}</h1>
                <p className={styles.lead}>{t.channelsLead}</p>
                {notice && <p className={styles.notice}>{notice}</p>}

                <div className={styles.channelCards}>
                  <article className={styles.channelCard}>
                    <div className={styles.channelCardHead}>
                      <h3>
                        Telegram{" "}
                        {project.channels.telegram.connected ? "✓" : "—"}
                      </h3>
                      <ChannelHelp
                        title={
                          uiLang === "en"
                            ? "How to connect Telegram"
                            : "Как подключить Telegram"
                        }
                        steps={TELEGRAM_HELP}
                      />
                    </div>
                    {project.channels.telegram.connected ? (
                      <>
                        <p>
                          {uiLang === "en" ? "Channel" : "Канал"}:{" "}
                          {project.channels.telegram.chatId}
                          <br />
                          {uiLang === "en" ? "Token" : "Токен"}:{" "}
                          {project.channels.telegram.botTokenMasked}
                        </p>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => disconnectChannel("telegram")}
                        >
                          {t.disconnect}
                        </button>
                      </>
                    ) : (
                      <div className={styles.form}>
                        <label className={styles.full}>
                          {t.botToken}
                          <input
                            value={tgToken}
                            onChange={(e) => setTgToken(e.target.value)}
                            placeholder="123456789:AAH..."
                          />
                        </label>
                        <label className={styles.full}>
                          {t.chatId}
                          <input
                            value={tgChat}
                            onChange={(e) => setTgChat(e.target.value)}
                            placeholder="@mychannel or -100..."
                          />
                        </label>
                        <button
                          type="button"
                          className="btn"
                          disabled={pending}
                          onClick={connectTelegram}
                        >
                          {t.connectTelegram}
                        </button>
                      </div>
                    )}
                  </article>

                  <article className={styles.channelCard}>
                    <div className={styles.channelCardHead}>
                      <h3>
                        VK {project.channels.vk.connected ? "✓" : "—"}
                      </h3>
                      <ChannelHelp
                        title={
                          uiLang === "en"
                            ? "How to connect VK"
                            : "Как подключить VK"
                        }
                        steps={VK_HELP}
                      />
                    </div>
                    {project.channels.vk.connected ? (
                      <>
                        <p>
                          {uiLang === "en" ? "Community" : "Сообщество"}:{" "}
                          {project.channels.vk.groupName ||
                            project.channels.vk.groupId}
                          {project.channels.vk.isStub && (
                            <>
                              <br />
                              <span className={styles.soonNote}>
                                {uiLang === "en" ? "Demo mode" : "Тестовый режим"}
                              </span>
                            </>
                          )}
                        </p>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => disconnectChannel("vk")}
                        >
                          {t.disconnect}
                        </button>
                      </>
                    ) : (
                      <div className={styles.form}>
                        <p className={styles.fieldHint}>
                          {uiLang === "en"
                            ? "Log in with VK and pick a community — like in other apps."
                            : "Войдите через VK и выберите сообщество — как в других приложениях."}
                        </p>
                        <button
                          type="button"
                          className="btn"
                          disabled={pending || vkPickLoading}
                          onClick={startVkOAuth}
                        >
                          {vkPickLoading ? "…" : t.connectVk}
                        </button>
                      </div>
                    )}
                  </article>

                  {(
                    [
                      "Facebook",
                      "Instagram",
                      "Threads",
                      "X",
                    ] as const
                  ).map((name) => (
                    <article
                      key={name}
                      className={`${styles.channelCard} ${styles.channelSoon}`}
                    >
                      <div className={styles.channelCardHead}>
                        <h3>
                          {name}{" "}
                          <span className={styles.soonBadge}>{t.channelSoon}</span>
                        </h3>
                      </div>
                      <p className={styles.soonNote}>{t.channelSoonNote}</p>
                    </article>
                  ))}
                </div>
                {error && <p className={styles.error}>{error}</p>}
              </section>
            )}
          </div>

          <nav className={styles.bottomNav} aria-label="Разделы кабинета">
            {TABS.map(({ key, short }) => (
              <button
                key={key}
                type="button"
                className={
                  step === key ? styles.bottomNavOn : styles.bottomNavBtn
                }
                onClick={() => {
                  setStep(key);
                  setMobileEdit(false);
                }}
              >
                {short}
              </button>
            ))}
          </nav>

          {vkPickOpen && (
            <div
              className={styles.modalBackdrop}
              role="dialog"
              aria-modal="true"
              aria-labelledby="vk-pick-title"
            >
              <div className={styles.modalCard}>
                <h2 id="vk-pick-title">
                  {uiLang === "en" ? "Choose VK community" : "Выберите сообщество VK"}
                </h2>
                <p>
                  {vkStubMode
                    ? uiLang === "en"
                      ? "Demo communities (VK keys not configured)."
                      : "Тестовые сообщества (ключи VK не настроены)."
                    : uiLang === "en"
                      ? "Pick where posts should be published."
                      : "Куда публиковать посты на стену."}
                </p>
                {vkPickLoading ? (
                  <p>{uiLang === "en" ? "Loading…" : "Загружаем…"}</p>
                ) : (
                  <div className={styles.vkGroupList}>
                    {vkGroups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className={styles.vkGroupRow}
                        disabled={pending}
                        onClick={() => void connectVkGroup(g.id)}
                      >
                        {g.photo50 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={g.photo50}
                            alt=""
                            className={styles.vkGroupAvatar}
                          />
                        ) : (
                          <span className={styles.vkGroupAvatar} aria-hidden>
                            VK
                          </span>
                        )}
                        <span className={styles.vkGroupMeta}>
                          <strong>{g.name}</strong>
                          {g.screenName && <span>vk.com/{g.screenName}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setVkPickOpen(false);
                      setVkGroups([]);
                      setError(null);
                    }}
                  >
                    {uiLang === "en" ? "Cancel" : "Отмена"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {deleteOpen && project && (
            <div
              className={styles.modalBackdrop}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-title"
            >
              <div className={styles.modalCard}>
                <h2 id="delete-title">Удалить бизнес?</h2>
                <p>
                  Бизнес «{project.name}» попадёт в корзину. Чтобы подтвердить,
                  введите его название точно:
                </p>
                <p className={styles.modalHint}>
                  <strong>{project.name}</strong>
                </p>
                <input
                  className={styles.createInput}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="Название бизнеса"
                  autoFocus
                />
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setDeleteOpen(false);
                      setDeleteConfirm("");
                      setError(null);
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={
                      pending ||
                      deleteConfirm.trim() !== project.name.trim()
                    }
                    onClick={removeProject}
                  >
                    {pending ? "Удаляем…" : "Удалить в корзину"}
                  </button>
                </div>
              </div>
            </div>
          )}


        </>
      )}

      {billingOpen && (
            <div
              className={styles.modalBackdrop}
              role="dialog"
              aria-modal="true"
              aria-labelledby="billing-title"
            >
              <div className={styles.modalCard}>
                <h2 id="billing-title">
                  {uiLang === "en" ? "Payment profile" : "Профиль оплаты"}
                </h2>
                <p>
                  {uiLang === "en" ? "Balance" : "Баланс"}:{" "}
                  <strong>
                    {balanceRub.toLocaleString(
                      uiLang === "en" ? "en-US" : "ru-RU"
                    )}{" "}
                    ₽
                  </strong>
                </p>
                <p className={styles.modalHint}>
                  {uiLang === "en"
                    ? `${postPriceRub} ₽ per post — charged before the marketer builds the weekly plan.`
                    : `${postPriceRub} ₽ за пост — списываем перед тем, как маркетолог составит план на неделю.`}
                </p>
                {!yookassaConfigured && (
                  <p className={styles.stubBanner}>
                    {uiLang === "en"
                      ? "YooKassa is not configured — top-ups go to demo balance."
                      : "ЮKassa не настроена — пополнение идёт в демо-баланс."}
                  </p>
                )}
                <p className={styles.bizLabel}>
                  {uiLang === "en" ? "Top up" : "Пополнить"}
                </p>
                <div className={styles.topupGrid}>
                  {topupPresets.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className={
                        topupAmount === amount ? styles.typeOn : styles.typeChip
                      }
                      onClick={() => setTopupAmount(amount)}
                    >
                      {amount} ₽
                    </button>
                  ))}
                </div>
                <label>
                  {uiLang === "en" ? "Custom amount" : "Своя сумма"}
                  <input
                    type="number"
                    min={50}
                    max={100000}
                    value={topupAmount}
                    onChange={(e) =>
                      setTopupAmount(Number(e.target.value) || 50)
                    }
                  />
                </label>
                {ledger.length > 0 && (
                  <div className={styles.ledgerBox}>
                    <p className={styles.bizLabel}>
                      {uiLang === "en" ? "History" : "История"}
                    </p>
                    {ledger.slice(0, 6).map((row) => (
                      <div key={row.id} className={styles.ledgerRow}>
                        <span>
                          {row.amountRub > 0 ? "+" : ""}
                          {row.amountRub} ₽ — {row.description}
                        </span>
                        <span className={styles.cellSub}>
                          {new Date(row.createdAt).toLocaleString(
                            uiLang === "en" ? "en-US" : "ru-RU"
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setBillingOpen(false)}
                  >
                    {uiLang === "en" ? "Close" : "Закрыть"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={pending || topupAmount < 50}
                    onClick={() => topUpBalance(topupAmount)}
                  >
                    {pending
                      ? uiLang === "en"
                        ? "Processing…"
                        : "Оформляем…"
                      : uiLang === "en"
                        ? `Pay ${topupAmount} ₽`
                        : `Оплатить ${topupAmount} ₽`}
                  </button>
                </div>
              </div>
            </div>
          )}

    </main>
  );
}
