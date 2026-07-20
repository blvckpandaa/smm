"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BrandBrief, Channel, ContentPlan } from "@/lib/marketer";
import type { PostDraft } from "@/lib/smm/types";
import {
  pickBestSlot,
  slotFromLocalInput,
} from "@/lib/schedule/pick-time";
import styles from "./plan.module.css";

const BUSINESS_TYPES = [
  "Кофейня / кафе",
  "Ресторан",
  "Клиника / медицина",
  "Курсы / образование",
  "Юрист / услуги",
  "IT / SaaS",
  "Магазин / e‑commerce",
  "Салон красоты",
  "Недвижимость",
  "Фитнес",
  "Онлайн-казино / iGaming",
  "Другое",
];

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

const TABS: { key: Tab; label: string; short: string }[] = [
  { key: "drafts", label: "Контент", short: "Посты" },
  { key: "plan", label: "Расписание", short: "План" },
  { key: "brief", label: "Бизнес", short: "Бизнес" },
  { key: "channels", label: "Каналы", short: "Каналы" },
];

type PublicChannels = {
  telegram: { connected: boolean; chatId?: string; botTokenMasked?: string };
  vk: { connected: boolean; groupId?: string; accessTokenMasked?: string };
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
  "Откройте сообщество VK, куда будете публиковать (или создайте новое).",
  "Узнайте ID группы: в адресе вида vk.com/club123456 число 123456 — это ID. Можно также посмотреть в «Управление → Настройки» или через сервисы вроде vk.com/dev.",
  "Создайте ключ доступа: Управление сообществом → Настройки → Работа с API → Создать ключ.",
  "Отметьте право «Стена» (wall) — без него посты не уйдут.",
  "Скопируйте токен в поле «Токен сообщества».",
  "В поле «ID группы» вставьте число без минуса (например 123456).",
  "Нажмите «Подключить VK».",
];

const META_FB_HELP = [
  "Нужна Facebook Page (не личный профиль).",
  "В Meta Developer App добавьте Facebook Login и укажите Redirect URI: {APP_URL}/api/meta/callback",
  "В .env задайте META_APP_ID, META_APP_SECRET и APP_URL (HTTPS ngrok).",
  "Нажмите «Войти через Meta» — пароль вводите только на сайте Meta.",
  "Для тестов добавьте свой аккаунт Tester в приложении Meta.",
];

const META_IG_HELP = [
  "Instagram должен быть Professional (Business/Creator) и связан с Facebook Page.",
  "Те же META_APP_ID / SECRET / APP_URL, что и для Facebook.",
  "Права: instagram_basic + instagram_content_publish.",
  "Для публикации нужен публичный HTTPS (ngrok) — Meta скачивает фото по URL.",
  "Нажмите «Войти через Meta» и разрешите доступ.",
];

const META_THREADS_HELP = [
  "Нужен аккаунт Threads, связанный с Instagram.",
  "В Meta App добавьте продукт Threads API и тот же Redirect URI.",
  "Нажмите «Войти через Meta» — откроется авторизация Threads.",
  "В режиме Development публиковать можно только с тестовых аккаунтов приложения.",
];

const X_HELP = [
  "Создайте приложение на developer.x.com (Twitter Developer Portal).",
  "Тип: Web App, права Read and Write + OAuth 2.0.",
  "Callback URL: {APP_URL}/api/x/callback (HTTPS через ngrok).",
  "В .env: X_CLIENT_ID и X_CLIENT_SECRET.",
  "Нажмите «Войти через X» — пароль только на сайте X.",
  "API X платный/с лимитами — нужен подходящий тариф Developer.",
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

const ACTIVE_KEY = "agentmark-active-project";

type AuthUser = { id: string; email: string; name: string };

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
  const [vkToken, setVkToken] = useState("");
  const [vkGroup, setVkGroup] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [metaStubMode, setMetaStubMode] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

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
        return refreshProjects();
      })
      .catch(() => setLoaded(true));
  }, [refreshProjects]);

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
    void fetch("/api/meta/status")
      .then((r) => r.json())
      .then((data: { stubMode?: boolean }) => {
        setMetaStubMode(Boolean(data.stubMode));
      })
      .catch(() => setMetaStubMode(true));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const metaError = params.get("meta_error");
    const metaOk = params.get("meta_ok");
    const metaStub = params.get("meta_stub");
    const stepParam = params.get("step");
    if (stepParam === "channels") setStep("channels");
    if (metaError) setError(decodeURIComponent(metaError));
    if (metaOk) {
      setError(null);
      if (metaStub) {
        setNotice(
          `${metaOk === "facebook" ? "Facebook" : metaOk === "instagram" ? "Instagram" : "Threads"} подключён в тестовом режиме (заглушка). Посты не уйдут в реальную сеть.`
        );
      }
      void refreshProjects(projectId);
    }
    if (metaError || metaOk || stepParam) {
      window.history.replaceState({}, "", "/plan");
    }
  }, [refreshProjects, projectId]);

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

  async function saveBrief() {
    if (!projectId || !brief) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: brief.brandName, brief }),
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
        body: JSON.stringify({ name: brief.brandName, brief }),
      });
      const res = await fetch(`/api/projects/${projectId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось собрать план");
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? data.project : p))
      );
      setBrief(briefForForm(data.project.brief));
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
      preferEvening: true,
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
        preferEvening: true,
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

  function startMetaOAuth(target: "facebook" | "instagram" | "threads") {
    if (!projectId) return;
    window.location.href = `/api/meta/start?projectId=${encodeURIComponent(
      projectId
    )}&target=${target}`;
  }

  async function connectMetaStub(
    channel: "facebook" | "instagram" | "threads"
  ) {
    if (!projectId) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/channels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, stub: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      if (data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
        setNotice(
          `${channel === "facebook" ? "Facebook" : channel === "instagram" ? "Instagram" : "Threads"} подключён как заглушка — можно планировать и тестировать публикацию.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  function startXOauth() {
    if (!projectId) return;
    window.location.href = `/api/x/start?projectId=${encodeURIComponent(
      projectId
    )}`;
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

  async function connectVk() {
    if (!projectId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/channels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "vk",
          accessToken: vkToken,
          groupId: vkGroup,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не подключено");
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? data.project : p))
      );
      setVkToken("");
      setVkGroup("");
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
          <p className={styles.lead}>Загрузка проектов…</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div className={`container ${styles.topInner}`}>
          <Link href="/" className={styles.logo}>
            AgentMark
          </Link>
          <div className={styles.projectBar}>
            {user && (
              <span className={styles.userChip}>
                {user.name}
                <button type="button" onClick={logout}>
                  Выйти
                </button>
              </span>
            )}
          </div>
        </div>
      </header>

      {!project || !brief ? (
        <div className={`container ${styles.layout}`}>
          <section className={`${styles.panel} ${styles.wide}`}>
            <h1 className={styles.title}>Кабинет AgentMark</h1>
            <p className={styles.lead}>
              Создайте бизнес ниже — откроется рабочий стол с контентом,
              расписанием и каналами.
            </p>
            <div className={styles.createRow}>
              <input
                className={styles.createInput}
                placeholder="Название бизнеса"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                disabled={pending}
                onClick={createNewProject}
              >
                Создать бизнес
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            {trash.length > 0 && (
              <div className={styles.trashBox}>
                <p className={styles.bizLabel}>Корзина</p>
                {trash.map((t) => (
                  <div key={t.id} className={styles.trashRow}>
                    <div>
                      <strong>{t.name}</strong>
                      <span className={styles.cellSub}>
                        удалён {new Date(t.deletedAt).toLocaleString("ru-RU")}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={pending}
                      onClick={() => restoreFromTrash(t.id)}
                    >
                      Восстановить
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
              <p className={styles.bizLabel}>Бизнес</p>
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
                      {p.brief.niche || "без ниши"}
                    </span>
                  </button>
                ))}
              </div>
              <div className={styles.createRowCompact}>
                <input
                  className={styles.createInput}
                  placeholder="Новый бизнес"
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
                Удалить
              </button>
            </div>
            <div className={styles.dashMeta}>
              <span>
                <strong>{project.name}</strong>
              </span>
              <span className={styles.hideXs}>
                {brief.niche || "ниша не выбрана"}
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
                <p className="eyebrow">Бизнес · {project.name}</p>
                <h1 className={styles.title}>Профиль бизнеса</h1>
                <p className={styles.lead}>
                  Данные для агентов. Можно править в любой момент — не анкета,
                  а настройки кабинета.
                </p>
                {trash.length > 0 && (
                  <div className={styles.trashBox}>
                    <p className={styles.bizLabel}>Корзина</p>
                    {trash.map((t) => (
                      <div key={t.id} className={styles.trashRow}>
                        <div>
                          <strong>{t.name}</strong>
                          <span className={styles.cellSub}>
                            удалён{" "}
                            {new Date(t.deletedAt).toLocaleString("ru-RU")}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={pending}
                          onClick={() => restoreFromTrash(t.id)}
                        >
                          Восстановить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {!project.plan && !project.drafts.length && (
                  <p className={styles.scheduleNote}>
                    План и тексты нужно собрать заново. Ранее сгенерированные
                    фото в папке медиа сохранились — после сборки можно
                    перегенерировать. Telegram/VK подключите снова в «Каналы».
                  </p>
                )}

                <div className={styles.form}>
                  <label>
                    Название бизнеса
                    <input
                      value={brief.brandName}
                      onChange={(e) =>
                        setBrief({ ...brief, brandName: e.target.value })
                      }
                      placeholder="например: Кофейня Утро"
                    />
                  </label>
                  <label className={styles.full}>
                    Тип бизнеса
                    <div className={styles.typeGrid}>
                      {BUSINESS_TYPES.map((type) => {
                        const active =
                          brief.niche === type ||
                          (type === "Другое" &&
                            brief.niche !== "" &&
                            !BUSINESS_TYPES.includes(brief.niche));
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
                                niche: type === "Другое" ? "" : type,
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
                    Ниша своими словами
                    <input
                      value={brief.niche}
                      onChange={(e) =>
                        setBrief({ ...brief, niche: e.target.value })
                      }
                      placeholder="уточните, если выбрали «Другое» или хотите точнее"
                    />
                  </label>
                  <label>
                    Часовой пояс
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
                    Сколько постов в неделю
                    <input
                      type="number"
                      min={4}
                      max={14}
                      value={brief.postsPerWeek}
                      onChange={(e) =>
                        setBrief({
                          ...brief,
                          postsPerWeek: Number(e.target.value) || 7,
                        })
                      }
                    />
                  </label>
                  <label>
                    С какой даты начать
                    <input
                      type="date"
                      value={brief.startDate}
                      onChange={(e) =>
                        setBrief({ ...brief, startDate: e.target.value })
                      }
                    />
                  </label>
                  <label className={styles.full}>
                    Что предлагаете клиентам
                    <input
                      value={brief.offer}
                      onChange={(e) =>
                        setBrief({ ...brief, offer: e.target.value })
                      }
                      placeholder="например: авторский кофе и выпечка"
                    />
                  </label>
                  <label className={styles.full}>
                    Стиль общения (через запятую)
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
                      placeholder="тёплый, простой, без пафоса"
                    />
                  </label>
                  <label className={styles.full}>
                    Кто ваши клиенты
                    <input
                      value={brief.audience.who}
                      onChange={(e) =>
                        setBrief({
                          ...brief,
                          audience: { ...brief.audience, who: e.target.value },
                        })
                      }
                      placeholder="например: офисные рядом, 25–40 лет"
                    />
                  </label>
                  <label className={styles.full}>
                    Какая у них проблема
                    <input
                      value={brief.audience.pain}
                      onChange={(e) =>
                        setBrief({
                          ...brief,
                          audience: { ...brief.audience, pain: e.target.value },
                        })
                      }
                      placeholder="например: устали от рекламных постов"
                    />
                  </label>
                  <label className={styles.full}>
                    Чего они хотят
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
                      placeholder="например: полезные советы и атмосферу"
                    />
                  </label>
                  <fieldset className={styles.full}>
                    <legend>Куда публиковать</legend>
                    <div className={styles.channels}>
                      {CHANNELS.map((ch) => {
                        const active = brief.channels.includes(ch.id);
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            className={active ? styles.chipOn : styles.chip}
                            onClick={() =>
                              setBrief({
                                ...brief,
                                channels: toggleChannel(brief.channels, ch.id),
                              })
                            }
                          >
                            {ch.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>

                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={pending}
                    onClick={saveBrief}
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={pending}
                    onClick={generatePlan}
                  >
                    {pending ? "Готовим план…" : "Составить план на неделю"}
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
                    Удалить бизнес
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
                <p className="eyebrow">Соцсети этого бизнеса</p>
                <h1 className={styles.title}>Подключите каналы</h1>
                <p className={styles.lead}>
                  Telegram и VK — токены вручную. Facebook, Instagram и Threads —
                  {metaStubMode
                    ? " сейчас работают в тестовом режиме (заглушка): подключение без Meta, публикация имитируется."
                    : " вход через официальный логин Meta (пароль вводите только у Meta). Для тестов нужен HTTPS через ngrok и Meta App."}
                </p>
                {metaStubMode && (
                  <p className={styles.stubBanner}>
                    Meta API не настроен — используйте кнопку «Подключить (тест)».
                    Когда появятся ключи в .env, включится настоящий OAuth.
                  </p>
                )}
                {notice && <p className={styles.notice}>{notice}</p>}

                <div className={styles.channelCards}>
                  <article className={styles.channelCard}>
                    <div className={styles.channelCardHead}>
                      <h3>
                        Telegram{" "}
                        {project.channels.telegram.connected ? "✓" : "—"}
                      </h3>
                      <ChannelHelp
                        title="Как подключить Telegram"
                        steps={TELEGRAM_HELP}
                      />
                    </div>
                    {project.channels.telegram.connected ? (
                      <>
                        <p>
                          Канал: {project.channels.telegram.chatId}
                          <br />
                          Токен: {project.channels.telegram.botTokenMasked}
                        </p>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => disconnectChannel("telegram")}
                        >
                          Отключить
                        </button>
                      </>
                    ) : (
                      <div className={styles.form}>
                        <label className={styles.full}>
                          Токен бота
                          <input
                            value={tgToken}
                            onChange={(e) => setTgToken(e.target.value)}
                            placeholder="123456789:AAH..."
                          />
                        </label>
                        <label className={styles.full}>
                          Chat ID канала или группы
                          <input
                            value={tgChat}
                            onChange={(e) => setTgChat(e.target.value)}
                            placeholder="@mychannel или -100..."
                          />
                        </label>
                        <button
                          type="button"
                          className="btn"
                          disabled={pending}
                          onClick={connectTelegram}
                        >
                          Подключить Telegram
                        </button>
                      </div>
                    )}
                  </article>

                  <article className={styles.channelCard}>
                    <div className={styles.channelCardHead}>
                      <h3>
                        VK {project.channels.vk.connected ? "✓" : "—"}
                      </h3>
                      <ChannelHelp title="Как подключить VK" steps={VK_HELP} />
                    </div>
                    {project.channels.vk.connected ? (
                      <>
                        <p>
                          Группа: {project.channels.vk.groupId}
                          <br />
                          Токен: {project.channels.vk.accessTokenMasked}
                        </p>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => disconnectChannel("vk")}
                        >
                          Отключить
                        </button>
                      </>
                    ) : (
                      <div className={styles.form}>
                        <label className={styles.full}>
                          Токен сообщества
                          <input
                            value={vkToken}
                            onChange={(e) => setVkToken(e.target.value)}
                            placeholder="токен с правом «Стена»"
                          />
                        </label>
                        <label className={styles.full}>
                          ID группы
                          <input
                            value={vkGroup}
                            onChange={(e) => setVkGroup(e.target.value)}
                            placeholder="число без минуса, например 123456"
                          />
                        </label>
                        <button
                          type="button"
                          className="btn"
                          disabled={pending}
                          onClick={connectVk}
                        >
                          Подключить VK
                        </button>
                      </div>
                    )}
                  </article>

                  <article className={styles.channelCard}>
                    <div className={styles.channelCardHead}>
                      <h3>
                        Facebook{" "}
                        {project.channels.facebook?.connected ? "✓" : "—"}
                      </h3>
                      <ChannelHelp
                        title="Как подключить Facebook"
                        steps={META_FB_HELP}
                      />
                    </div>
                    {project.channels.facebook?.connected ? (
                      <>
                        <p>
                          Page: {project.channels.facebook.pageName}
                          {project.channels.facebook.isStub ? " · заглушка" : ""}
                          <br />
                          ID: {project.channels.facebook.pageId}
                        </p>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => disconnectChannel("facebook")}
                        >
                          Отключить
                        </button>
                      </>
                    ) : (
                      <div className={styles.channelActions}>
                        {metaStubMode ? (
                          <button
                            type="button"
                            className="btn"
                            disabled={pending}
                            onClick={() => connectMetaStub("facebook")}
                          >
                            Подключить (тест)
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => startMetaOAuth("facebook")}
                            >
                              Войти через Meta
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={pending}
                              onClick={() => connectMetaStub("facebook")}
                            >
                              Заглушка
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </article>

                  <article className={styles.channelCard}>
                    <div className={styles.channelCardHead}>
                      <h3>
                        Instagram{" "}
                        {project.channels.instagram?.connected ? "✓" : "—"}
                      </h3>
                      <ChannelHelp
                        title="Как подключить Instagram"
                        steps={META_IG_HELP}
                      />
                    </div>
                    {project.channels.instagram?.connected ? (
                      <>
                        <p>
                          Page: {project.channels.instagram.pageName}
                          {project.channels.instagram.isStub
                            ? " · заглушка"
                            : ""}
                          <br />
                          IG ID: {project.channels.instagram.igUserId}
                        </p>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => disconnectChannel("instagram")}
                        >
                          Отключить
                        </button>
                      </>
                    ) : (
                      <div className={styles.channelActions}>
                        {metaStubMode ? (
                          <button
                            type="button"
                            className="btn"
                            disabled={pending}
                            onClick={() => connectMetaStub("instagram")}
                          >
                            Подключить (тест)
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => startMetaOAuth("instagram")}
                            >
                              Войти через Meta
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={pending}
                              onClick={() => connectMetaStub("instagram")}
                            >
                              Заглушка
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </article>

                  <article className={styles.channelCard}>
                    <div className={styles.channelCardHead}>
                      <h3>
                        Threads {project.channels.threads?.connected ? "✓" : "—"}
                      </h3>
                      <ChannelHelp
                        title="Как подключить Threads"
                        steps={META_THREADS_HELP}
                      />
                    </div>
                    {project.channels.threads?.connected ? (
                      <>
                        <p>
                          @{project.channels.threads.username || "threads"}
                          {project.channels.threads.isStub ? " · заглушка" : ""}
                          <br />
                          ID: {project.channels.threads.threadsUserId}
                        </p>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => disconnectChannel("threads")}
                        >
                          Отключить
                        </button>
                      </>
                    ) : (
                      <div className={styles.channelActions}>
                        {metaStubMode ? (
                          <button
                            type="button"
                            className="btn"
                            disabled={pending}
                            onClick={() => connectMetaStub("threads")}
                          >
                            Подключить (тест)
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => startMetaOAuth("threads")}
                            >
                              Войти через Meta
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={pending}
                              onClick={() => connectMetaStub("threads")}
                            >
                              Заглушка
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </article>

                  <article className={styles.channelCard}>
                    <div className={styles.channelCardHead}>
                      <h3>X {project.channels.x?.connected ? "✓" : "—"}</h3>
                      <ChannelHelp title="Как подключить X" steps={X_HELP} />
                    </div>
                    {project.channels.x?.connected ? (
                      <>
                        <p>
                          @{project.channels.x.username || "x"}
                          <br />
                          {project.channels.x.name || ""}
                        </p>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => disconnectChannel("x")}
                        >
                          Отключить
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn"
                        onClick={startXOauth}
                      >
                        Войти через X
                      </button>
                    )}
                  </article>
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
    </main>
  );
}
