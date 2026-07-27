"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { parseVkGroupId } from "@/lib/vk/parse-group-id";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { BrandLogo } from "@/app/components/BrandLogo";
import styles from "./plan.module.css";
import { BotsPanel, type PublicBot, type PublicBotReply } from "./BotsPanel";

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

type Tab = "brief" | "plan" | "drafts" | "channels" | "bots";

type NavItem = {
  key: Tab;
  label: string;
  short: string;
  hint: string;
  group: "work" | "connect" | "settings";
};

function NavGlyph({ tab }: { tab: Tab }) {
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (tab) {
    case "drafts":
      return (
        <svg {...props}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "plan":
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "channels":
      return (
        <svg {...props}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case "bots":
      return (
        <svg {...props}>
          <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      );
    case "brief":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
  }
}

function navItemsFor(lang: UiLang): NavItem[] {
  const t = dict[lang];
  return [
    {
      key: "drafts",
      label: t.tabDrafts,
      short: t.tabDraftsShort,
      hint: t.navHintDrafts,
      group: "work",
    },
    {
      key: "plan",
      label: t.tabPlan,
      short: t.tabPlanShort,
      hint: t.navHintPlan,
      group: "work",
    },
    {
      key: "channels",
      label: t.tabChannels,
      short: t.tabChannelsShort,
      hint: t.navHintChannels,
      group: "connect",
    },
    {
      key: "bots",
      label: t.tabBots,
      short: t.tabBotsShort,
      hint: t.navHintBots,
      group: "connect",
    },
    {
      key: "brief",
      label: t.tabBrief,
      short: t.tabBriefShort,
      hint: t.navHintBrief,
      group: "settings",
    },
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
    hasUserPhotoToken?: boolean;
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
  planJob?: {
    status: "running" | "failed";
    startedAt: string;
    error?: string;
    chargedRub?: number;
    postsCount?: number;
    balanceRub?: number;
  } | null;
  drafts: PostDraft[];
  draftsSource: "deepseek" | "local" | null;
  draftsJob?: {
    status: "running" | "failed";
    startedAt: string;
    phase?: "texts" | "photos";
    photoDone?: number;
    photoTotal?: number;
    error?: string;
  } | null;
  channels: PublicChannels;
  bots?: {
    vk: PublicBot;
    telegram: PublicBot;
  };
  botReplies?: PublicBotReply[];
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
  "Нажмите «1. Открыть вход VK» — откроется новое окно.",
  "Нажмите синюю кнопку «Kate Mobile», затем «Разрешить» (войдите как администратор сообщества).",
  "После этого вверху окна появится длинная ссылка, которая начинается с oauth.vk.com — выделите её целиком и скопируйте (Ctrl+C).",
  "Вернитесь сюда, вставьте ссылку в поле (Ctrl+V) и нажмите «Продолжить». Выберите своё сообщество из списка.",
  "Если VK напишет предупреждение — не пугайтесь: вставляйте ссылку только в SMM-Agents, никуда больше.",
];

const VK_HELP_EN = [
  "Click “1. Open VK login” — a new window opens.",
  "Click the blue “Kate Mobile” button, then Allow (sign in as a community admin).",
  "At the top of that window a long link starting with oauth.vk.com appears — select it all and copy (Ctrl+C).",
  "Come back here, paste the link into the field (Ctrl+V) and click Continue. Pick your community from the list.",
  "If VK shows a warning — that’s normal. Paste the link only into SMM-Agents, nowhere else.",
];

/** Прямой OAuth Kate Mobile */
const VK_KATE_AUTH_URL =
  "https://oauth.vk.com/authorize?client_id=2685278&display=page&redirect_uri=https%3A%2F%2Foauth.vk.com%2Fblank.html&scope=wall%2Cphotos%2Cgroups%2Coffline&response_type=token&v=5.199";

const VK_HOST_URL = "https://vkhost.github.io/";

function toggleChannel(list: Channel[], id: Channel): Channel[] {
  if (list.includes(id)) {
    const next = list.filter((c) => c !== id);
    return next.length ? next : list;
  }
  return [...list, id];
}

type PostsStatusFilter =
  | "all"
  | "attention"
  | "today"
  | "draft"
  | "scheduled"
  | "published"
  | "failed";

type PostsSort = "soon" | "latest" | "channel";

function statusLabel(
  status: PostDraft["status"],
  lang: UiLang = "ru"
): string {
  const ru: Record<PostDraft["status"], string> = {
    draft: "черновик",
    pending_approval: "ждёт проверки",
    approved: "одобрен",
    scheduled: "запланирован",
    rejected: "отклонён",
    published: "опубликован",
    failed: "ошибка",
  };
  const en: Record<PostDraft["status"], string> = {
    draft: "draft",
    pending_approval: "pending",
    approved: "approved",
    scheduled: "scheduled",
    rejected: "rejected",
    published: "published",
    failed: "failed",
  };
  return (lang === "en" ? en : ru)[status];
}

function channelLabel(channel: Channel): string {
  return CHANNELS.find((c) => c.id === channel)?.label ?? channel;
}

function todayInZone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function addDaysIso(day: string, days: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayHeading(
  day: string,
  today: string,
  weekday: string,
  lang: UiLang
): string {
  if (day === today) return lang === "en" ? "Today" : "Сегодня";
  if (day === addDaysIso(today, 1))
    return lang === "en" ? "Tomorrow" : "Завтра";
  if (day === addDaysIso(today, -1))
    return lang === "en" ? "Yesterday" : "Вчера";
  return `${weekday} · ${day.slice(5).replace("-", ".")}`;
}

function needsAttention(status: PostDraft["status"]): boolean {
  return (
    status === "failed" ||
    status === "rejected" ||
    status === "draft" ||
    status === "pending_approval" ||
    status === "approved"
  );
}

function matchesStatusFilter(
  draft: PostDraft,
  filter: PostsStatusFilter,
  today: string
): boolean {
  if (filter === "all") return true;
  if (filter === "attention") return needsAttention(draft.status);
  if (filter === "today") return draft.day === today;
  if (filter === "draft") {
    return (
      draft.status === "draft" ||
      draft.status === "pending_approval" ||
      draft.status === "approved"
    );
  }
  if (filter === "failed") {
    return draft.status === "failed" || draft.status === "rejected";
  }
  return draft.status === filter;
}

function mediaLabel(
  draft: PostDraft,
  t: (typeof dict)[UiLang]
): string {
  if (draft.imagePath || draft.videoPath) return t.postsMediaYes;
  if (draft.needsPhoto || draft.needsVideo) return t.postsMediaNeed;
  return t.postsMediaNo;
}

function canPublishChannel(channel: Channel): boolean {
  return (
    channel === "telegram" ||
    channel === "vk" ||
    channel === "facebook" ||
    channel === "instagram" ||
    channel === "threads" ||
    channel === "x"
  );
}

function nextPostAction(
  draft: PostDraft,
  lang: UiLang
): {
  kind: "fix" | "schedule" | "publish" | "done";
  label: string;
} {
  if (draft.status === "published") {
    return {
      kind: "done",
      label: lang === "en" ? "Published" : "Готово",
    };
  }
  if (draft.status === "failed" || draft.status === "rejected") {
    return {
      kind: "fix",
      label: lang === "en" ? "Fix & publish" : "Исправить",
    };
  }
  if (draft.status === "scheduled") {
    return {
      kind: "publish",
      label: lang === "en" ? "Publish now" : "Опубликовать",
    };
  }
  return {
    kind: "schedule",
    label: lang === "en" ? "Schedule" : "В очередь",
  };
}

function suggestPostsFilter(stats: {
  failed: number;
  draft: number;
  scheduled: number;
  today: number;
}): PostsStatusFilter {
  if (stats.failed > 0) return "failed";
  if (stats.draft > 0) return "draft";
  if (stats.today > 0) return "today";
  if (stats.scheduled > 0) return "scheduled";
  return "all";
}

function isChannelConnected(
  channels: PublicChannels | undefined,
  channel: Channel
): boolean {
  if (!channels) return false;
  const entry = channels[channel as keyof PublicChannels];
  return Boolean(entry && "connected" in entry && entry.connected);
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
  const [planPolling, setPlanPolling] = useState(false);
  const planPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [draftsPolling, setDraftsPolling] = useState(false);
  const draftsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [mobileEdit, setMobileEdit] = useState(false);
  const [postsChannelFilter, setPostsChannelFilter] = useState<
    "all" | Channel
  >("all");
  const [postsStatusFilter, setPostsStatusFilter] =
    useState<PostsStatusFilter>("all");
  const [postsSearch, setPostsSearch] = useState("");
  const [postsSort, setPostsSort] = useState<PostsSort>("soon");
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
  const [vkUserToken, setVkUserToken] = useState("");
  const [vkAppId, setVkAppId] = useState<string | null>(null);
  const [vkAutoList, setVkAutoList] = useState(false);
  const [vkGroupId, setVkGroupId] = useState("");
  const [vkPickOpen, setVkPickOpen] = useState(false);
  const [vkGroups, setVkGroups] = useState<
    { id: number; name: string; screenName?: string; photo50?: string }[]
  >([]);
  const [vkPickLoading, setVkPickLoading] = useState(false);
  const [vkStubMode, setVkStubMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [uiLang, setUiLang] = useState<UiLang>("ru");
  const [isAdmin, setIsAdmin] = useState(false);
  const [balanceRub, setBalanceRub] = useState(0);
  const [postPriceRub, setPostPriceRub] = useState(50);
  const [rewritePriceRub, setRewritePriceRub] = useState(25);
  const [imagePriceRub, setImagePriceRub] = useState(25);
  const [botVkPeriodRub, setBotVkPeriodRub] = useState(290);
  const [botTgPeriodRub, setBotTgPeriodRub] = useState(290);
  const [botFaqReplyRub, setBotFaqReplyRub] = useState(0);
  const [botAiReplyRub, setBotAiReplyRub] = useState(2);
  const [botPeriodDays, setBotPeriodDays] = useState(30);
  const router = useRouter();
  const t = dict[uiLang];
  const NAV = useMemo(() => navItemsFor(uiLang), [uiLang]);
  const navGroups = useMemo(
    () =>
      [
        {
          id: "work" as const,
          title: t.navGroupWork,
          items: NAV.filter((i) => i.group === "work"),
        },
        {
          id: "connect" as const,
          title: t.navGroupConnect,
          items: NAV.filter((i) => i.group === "connect"),
        },
        {
          id: "settings" as const,
          title: t.navGroupSettings,
          items: NAV.filter((i) => i.group === "settings"),
        },
      ] as const,
    [NAV, t.navGroupWork, t.navGroupConnect, t.navGroupSettings]
  );
  const BUSINESS_TYPES = BUSINESS_TYPES_I18N[uiLang];
  const otherLabel = t.other;

  const refreshBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing");
      if (!res.ok) return;
      const data = await res.json();
      setBalanceRub(Number(data.balanceRub) || 0);
      setPostPriceRub(Number(data.postPriceRub) || 50);
      setRewritePriceRub(Number(data.rewritePriceRub) || 25);
      setImagePriceRub(Number(data.imagePriceRub) || 25);
      setBotVkPeriodRub(Number(data.botVkPeriodRub) || 290);
      setBotTgPeriodRub(Number(data.botTgPeriodRub) || 290);
      setBotFaqReplyRub(
        typeof data.botFaqReplyRub === "number" ? data.botFaqReplyRub : 0
      );
      setBotAiReplyRub(Number(data.botAiReplyRub) || 2);
      setBotPeriodDays(Number(data.botPeriodDays) || 30);
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

  function openBilling() {
    router.push("/plan/billing");
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

  const postsToday = useMemo(
    () => todayInZone(brief?.timezone || project?.brief.timezone || "Europe/Moscow"),
    [brief?.timezone, project?.brief.timezone]
  );

  const postsStats = useMemo(() => {
    const drafts = project?.drafts ?? [];
    const byChannel = new Map<Channel, number>();
    for (const d of drafts) {
      byChannel.set(d.channel, (byChannel.get(d.channel) ?? 0) + 1);
    }
    return {
      total: drafts.length,
      attention: drafts.filter((d) => needsAttention(d.status)).length,
      today: drafts.filter((d) => d.day === postsToday).length,
      draft: drafts.filter((d) =>
        matchesStatusFilter(d, "draft", postsToday)
      ).length,
      scheduled: drafts.filter((d) => d.status === "scheduled").length,
      published: drafts.filter((d) => d.status === "published").length,
      failed: drafts.filter(
        (d) => d.status === "failed" || d.status === "rejected"
      ).length,
      nextQueued:
        drafts
          .filter((d) => d.status === "scheduled")
          .sort((a, b) =>
            (a.scheduledAtIso || "").localeCompare(b.scheduledAtIso || "")
          )[0] ?? null,
      channels: [...byChannel.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [project?.drafts, postsToday]);

  const postsFiltersActive =
    postsChannelFilter !== "all" ||
    postsStatusFilter !== "all" ||
    postsSearch.trim().length > 0;

  const filteredDrafts = useMemo(() => {
    const drafts = project?.drafts ?? [];
    const q = postsSearch.trim().toLowerCase();
    let list = drafts.filter((d) => {
      if (
        postsChannelFilter !== "all" &&
        d.channel !== postsChannelFilter
      ) {
        return false;
      }
      if (!matchesStatusFilter(d, postsStatusFilter, postsToday)) return false;
      if (!q) return true;
      const hay = `${d.title} ${d.topic} ${d.body} ${d.channel}`.toLowerCase();
      return hay.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (postsSort === "channel") {
        const c = a.channel.localeCompare(b.channel);
        if (c !== 0) return c;
        return (a.scheduledAtIso || "").localeCompare(b.scheduledAtIso || "");
      }
      if (postsSort === "latest") {
        return (b.scheduledAtIso || "").localeCompare(a.scheduledAtIso || "");
      }
      const rank = (s: PostDraft["status"]) => {
        if (s === "failed" || s === "rejected") return 0;
        if (s === "draft" || s === "pending_approval" || s === "approved")
          return 1;
        if (s === "scheduled") return 2;
        return 3;
      };
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return (a.scheduledAtIso || "").localeCompare(b.scheduledAtIso || "");
    });
    return list;
  }, [
    project?.drafts,
    postsChannelFilter,
    postsStatusFilter,
    postsSearch,
    postsSort,
    postsToday,
  ]);

  const filteredDraftGroups = useMemo(() => {
    const groups: {
      key: string;
      label: string;
      items: PostDraft[];
    }[] = [];
    if (postsSort === "channel") {
      for (const draft of filteredDrafts) {
        const key = draft.channel;
        const last = groups[groups.length - 1];
        if (last && last.key === key) last.items.push(draft);
        else {
          groups.push({
            key,
            label: channelLabel(draft.channel),
            items: [draft],
          });
        }
      }
      return groups;
    }
    for (const draft of filteredDrafts) {
      const key = draft.day;
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(draft);
      else {
        groups.push({
          key,
          label: dayHeading(draft.day, postsToday, draft.weekday, uiLang),
          items: [draft],
        });
      }
    }
    return groups;
  }, [filteredDrafts, postsSort, postsToday, uiLang]);

  useEffect(() => {
    if (!filteredDrafts.length) return;
    if (
      selectedDraftId &&
      filteredDrafts.some((d) => d.id === selectedDraftId)
    ) {
      return;
    }
    // Prefer failed / attention item when jumping into a filtered list
    const prefer =
      filteredDrafts.find(
        (d) => d.status === "failed" || d.status === "rejected"
      ) ?? filteredDrafts[0];
    setSelectedDraftId(prefer.id);
  }, [filteredDrafts, selectedDraftId]);

  const postsFilterBootRef = useRef<string | null>(null);
  useEffect(() => {
    if (!projectId || !project?.drafts.length) return;
    if (postsFilterBootRef.current === projectId) return;
    postsFilterBootRef.current = projectId;
    setPostsStatusFilter(
      suggestPostsFilter({
        failed: postsStats.failed,
        draft: postsStats.draft,
        scheduled: postsStats.scheduled,
        today: postsStats.today,
      })
    );
  }, [projectId, project?.drafts.length, postsStats]);

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
      if (active.draftsJob?.status === "running") {
        setStep(active.drafts?.length ? "drafts" : "plan");
      } else if (active.drafts?.length) {
        setStep("drafts");
      } else if (active.plan) {
        setStep("plan");
      } else {
        setStep("brief");
      }
      setSelectedDraftId(active.drafts[0]?.id ?? null);
      if (active.planJob?.status === "failed" && active.planJob.error) {
        setError(active.planJob.error);
      }
      if (active.draftsJob?.status === "failed" && active.draftsJob.error) {
        setError(active.draftsJob.error);
      }
    } else {
      setBrief(null);
      setStep("brief");
      setSelectedDraftId(null);
    }
    setLoaded(true);
    return list;
  }, []);

  const stopPlanPolling = useCallback(() => {
    if (planPollRef.current) {
      clearInterval(planPollRef.current);
      planPollRef.current = null;
    }
    setPlanPolling(false);
  }, []);

  const resumePlanPolling = useCallback(
    (pid: string) => {
      if (planPollRef.current) return;
      setPending(true);
      setPlanPolling(true);
      setError(null);
      setNotice(
        uiLang === "en"
          ? "Building the weekly plan… You can refresh — generation continues on the server."
          : "Собираем план на неделю… Можно обновить страницу — генерация продолжается на сервере."
      );

      const tick = async () => {
        try {
          const res = await fetch(`/api/projects/${pid}`);
          if (!res.ok) return false;
          const data = await res.json();
          const p = data.project as PublicProject | undefined;
          if (!p) return false;
          setProjects((prev) => prev.map((x) => (x.id === pid ? p : x)));
          if (typeof p.planJob?.balanceRub === "number") {
            setBalanceRub(p.planJob.balanceRub);
          }
          if (p.plan) {
            stopPlanPolling();
            setPending(false);
            setBrief(briefForForm(p.brief));
            setStep("plan");
            void refreshBilling();
            setNotice(
              uiLang === "en" ? "Weekly plan is ready." : "План на неделю готов."
            );
            return true;
          }
          if (p.planJob?.status === "failed") {
            stopPlanPolling();
            setPending(false);
            setError(p.planJob.error || "Не удалось собрать план");
            if (typeof p.planJob.balanceRub === "number") {
              setBalanceRub(p.planJob.balanceRub);
            }
            void refreshBilling();
            return true;
          }
        } catch {
          /* keep polling */
        }
        return false;
      };

      void tick().then((done) => {
        if (done) return;
        planPollRef.current = setInterval(() => {
          void tick().then((finished) => {
            if (finished) stopPlanPolling();
          });
        }, 2500);
      });
    },
    [refreshBilling, stopPlanPolling, uiLang]
  );

  const stopDraftsPolling = useCallback(() => {
    if (draftsPollRef.current) {
      clearInterval(draftsPollRef.current);
      draftsPollRef.current = null;
    }
    setDraftsPolling(false);
  }, []);

  const PHOTO_CONCURRENCY = 3;

  const draftsJobNotice = useCallback(
    (job: PublicProject["draftsJob"]) => {
      if (!job || job.status !== "running") return null;
      if (job.phase === "texts") {
        return uiLang === "en"
          ? "Writing post texts… (~30 sec)"
          : "Пишем тексты постов… (~30 сек)";
      }
      if (job.phase === "photos") {
        const done = job.photoDone ?? 0;
        const total = job.photoTotal ?? 0;
        const left = Math.max(0, total - done);
        const mins = Math.max(1, Math.ceil(left / PHOTO_CONCURRENCY / 2));
        return uiLang === "en"
          ? `Texts ready. Generating photos ${done}/${total}… (~${mins} min left). You can read drafts meanwhile.`
          : `Тексты готовы. Генерируем фото ${done}/${total}… (ещё ~${mins} мин). Черновики уже можно смотреть.`;
      }
      return uiLang === "en"
        ? "Writing post texts and photos… You can refresh — generation continues on the server."
        : "Пишем тексты и фото… Можно обновить страницу — генерация продолжается на сервере.";
    },
    [uiLang]
  );

  const resumeDraftsPolling = useCallback(
    (pid: string) => {
      if (draftsPollRef.current) return;
      setPending(true);
      setDraftsPolling(true);
      setError(null);
      setNotice(
        uiLang === "en"
          ? "Writing post texts… (~30 sec, then photos in parallel)"
          : "Пишем тексты… (~30 сек, затем фото параллельно)"
      );

      const tick = async () => {
        try {
          const res = await fetch(`/api/projects/${pid}`);
          if (!res.ok) return false;
          const data = await res.json();
          const p = data.project as PublicProject | undefined;
          if (!p) return false;
          setProjects((prev) => prev.map((x) => (x.id === pid ? p : x)));
          const notice = draftsJobNotice(p.draftsJob);
          if (notice) setNotice(notice);
          if (p.draftsJob?.status === "running") {
            if (p.drafts?.length) {
              setStep("drafts");
              setSelectedDraftId((prev) => prev ?? p.drafts[0]?.id ?? null);
            }
            return false;
          }
          if (p.draftsJob?.status === "failed") {
            stopDraftsPolling();
            setPending(false);
            setError(p.draftsJob.error || "Не удалось написать посты");
            return true;
          }
          stopDraftsPolling();
          setPending(false);
          setSelectedDraftId(p.drafts[0]?.id ?? null);
          setStep("drafts");
          setNotice(
            uiLang === "en" ? "Post texts are ready." : "Тексты постов готовы."
          );
          return true;
        } catch {
          /* keep polling */
        }
        return false;
      };

      void tick().then((done) => {
        if (done) return;
        draftsPollRef.current = setInterval(() => {
          void tick().then((finished) => {
            if (finished) stopDraftsPolling();
          });
        }, 2500);
      });
    },
    [draftsJobNotice, stopDraftsPolling, uiLang]
  );

  useEffect(() => {
    if (!projectId || !project) return;
    if (project.planJob?.status === "running" && !planPolling && !project.plan) {
      resumePlanPolling(projectId);
    }
  }, [project, projectId, planPolling, resumePlanPolling]);

  useEffect(() => {
    if (!projectId || !project) return;
    if (project.draftsJob?.status === "running" && !draftsPolling) {
      resumeDraftsPolling(projectId);
    }
  }, [project, projectId, draftsPolling, resumeDraftsPolling]);

  useEffect(() => {
    return () => {
      if (planPollRef.current) clearInterval(planPollRef.current);
      if (draftsPollRef.current) clearInterval(draftsPollRef.current);
    };
  }, []);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d: { user?: AuthUser | null; isAdmin?: boolean }) => {
        if (!d.user) {
          window.location.href = "/login?next=/plan";
          return;
        }
        setUser(d.user);
        setIsAdmin(Boolean(d.isAdmin));
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
    void fetch("/api/vk/status")
      .then((r) => r.json())
      .then((d) => {
        setVkAppId(d.appId ?? null);
        setVkAutoList(Boolean(d.autoConnectReady));
      })
      .catch(() => {});
  }, []);

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
    if (vkError) {
      const decoded = decodeURIComponent(vkError);
      if (/security error/i.test(decoded)) {
        setError(
          uiLang === "en"
            ? "VK could not finish automatic login. Use the steps below: open VK login, allow access, paste the long link here."
            : "Автоматический вход не сработал. Сделайте по шагам ниже: откройте вход VK, разрешите доступ, вставьте длинную ссылку сюда."
        );
      } else {
        setError(decoded);
      }
    }
    const vkNotice = params.get("vk_notice");
    if (vkNotice) {
      setError(null);
      setNotice(decodeURIComponent(vkNotice));
    }
    if (params.get("vk_photo") === "1") {
      setError(null);
      setNotice(
        uiLang === "en"
          ? "Personal VK token saved — photo upload enabled."
          : "Личный токен VK сохранён — загрузка фото включена."
      );
      void refreshProjects(projectId);
    }
    if (params.get("vk_connected") === "1") {
      setError(null);
      setNotice(
        uiLang === "en"
          ? "VK community connected."
          : "Сообщество VK подключено."
      );
      void refreshProjects(projectId);
    }
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
    if (billing === "return" || billing === "crypto_ok") {
      window.location.replace(`/plan/billing?billing=${billing}`);
      return;
    }
    if (metaError || metaOk || vkError || vkPick || stepParam) {
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
    setNotice(
      uiLang === "en"
        ? "Building the weekly plan… You can refresh — generation continues on the server."
        : "Собираем план на неделю… Можно обновить страницу — генерация продолжается на сервере."
    );
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
          openBilling();
          if (typeof data.balanceRub === "number") setBalanceRub(data.balanceRub);
        }
        throw new Error(data.error || "Не удалось собрать план");
      }
      if (data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
      }
      if (data.billing?.chargedRub) {
        setBalanceRub(data.billing.balanceRub);
        setNotice(
          uiLang === "en"
            ? `Charged ${data.billing.chargedRub} ₽ for ${data.billing.postsCount} posts. Building plan…`
            : `Списано ${data.billing.chargedRub} ₽ за ${data.billing.postsCount} постов. Собираем план…`
        );
        void refreshBilling();
      }
      if (data.status === "running" || res.status === 202) {
        resumePlanPolling(projectId);
        return;
      }
      // fallback: sync response with ready plan
      if (data.project?.plan) {
        setBrief(briefForForm(data.project.brief));
        setStep("plan");
        setPending(false);
      }
    } catch (e) {
      setPending(false);
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function generateDrafts() {
    if (!projectId) return;
    setPending(true);
    setError(null);
    setNotice(
      uiLang === "en"
        ? "Writing post texts… (~30 sec, then photos in parallel)"
        : "Пишем тексты… (~30 сек, затем фото параллельно по 3 штуки)"
    );
    try {
      const res = await fetch(`/api/projects/${projectId}/posts`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось написать посты");
      if (data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
      }
      if (data.status === "running" || res.status === 202) {
        resumeDraftsPolling(projectId);
        return;
      }
      setSelectedDraftId(data.project?.drafts?.[0]?.id ?? null);
      setStep("drafts");
      setPending(false);
    } catch (e) {
      setPending(false);
      setError(e instanceof Error ? e.message : "Ошибка");
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
    if (balanceRub < imagePriceRub) {
      setError(
        uiLang === "en"
          ? `Need ${imagePriceRub} ₽ for a new photo, balance ${balanceRub} ₽`
          : `Нужно ${imagePriceRub} ₽ за фото, на балансе ${balanceRub} ₽`
      );
      openBilling();
      return;
    }
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
        if (typeof data.balanceRub === "number") setBalanceRub(data.balanceRub);
        if (res.status === 402) openBilling();
        throw new Error(data.error || "Не удалось сгенерировать фото");
      }
      if (typeof data.billing?.balanceRub === "number") {
        setBalanceRub(data.billing.balanceRub);
      }
      if (data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
      }
      if (data.billing?.chargedRub) {
        setNotice(
          uiLang === "en"
            ? `Charged ${data.billing.chargedRub} ₽ for photo`
            : `Списано ${data.billing.chargedRub} ₽ за фото`
        );
      }
      void refreshBilling();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  }

  async function rewriteDraftText(draftId: string) {
    if (!projectId) return;
    if (balanceRub < rewritePriceRub) {
      setError(
        uiLang === "en"
          ? `Need ${rewritePriceRub} ₽ to rewrite, balance ${balanceRub} ₽`
          : `Нужно ${rewritePriceRub} ₽ за переписывание, на балансе ${balanceRub} ₽`
      );
      openBilling();
      return;
    }
    setBusyId(draftId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/drafts/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.balanceRub === "number") setBalanceRub(data.balanceRub);
        if (res.status === 402) openBilling();
        throw new Error(data.error || "Не удалось переписать текст");
      }
      if (typeof data.billing?.balanceRub === "number") {
        setBalanceRub(data.billing.balanceRub);
      }
      if (data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
      }
      if (data.billing?.chargedRub) {
        setNotice(
          uiLang === "en"
            ? `Charged ${data.billing.chargedRub} ₽ for rewrite`
            : `Списано ${data.billing.chargedRub} ₽ за переписывание`
        );
      }
      void refreshBilling();
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
      if (data.warning) {
        setNotice(data.warning);
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
      if (!res.ok) {
        setVkPickOpen(false);
        if (data.needsCommunityToken) {
          setNotice(
            uiLang === "en"
              ? "Could not load communities. Enter community ID below and connect again."
              : "Не удалось загрузить список. Укажите ID группы ниже и нажмите «Подключить VK» ещё раз."
          );
          setError(null);
          setStep("channels");
          return;
        }
        throw new Error(data.error || "Не удалось загрузить сообщества");
      }
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

  function startVkCommunityOAuth(groupId?: string) {
    if (!projectId) return;
    const gid = parseVkGroupId(groupId || vkGroupId);
    if (!gid) {
      setError(
        uiLang === "en"
          ? "Paste vk.com/club123456 link or numeric community ID"
          : "Вставьте ссылку vk.com/club123456 или ID сообщества"
      );
      return;
    }
    window.location.href = `/api/vk/start-community?projectId=${encodeURIComponent(projectId)}&groupId=${encodeURIComponent(gid)}`;
  }

  function openVkLogin() {
    window.open(VK_KATE_AUTH_URL, "vk_oauth", "noopener,noreferrer,width=720,height=720");
    setNotice(
      uiLang === "en"
        ? "In the new window click Allow. Then copy the long link at the top (starts with oauth.vk.com) and paste it below."
        : "В новом окне нажмите «Разрешить». Затем скопируйте длинную ссылку сверху окна (начинается с oauth.vk.com) и вставьте сюда."
    );
  }

  function openVkHost() {
    window.open(VK_HOST_URL, "vk_host", "noopener,noreferrer,width=900,height=800");
    setNotice(
      uiLang === "en"
        ? "In the new window: click Kate Mobile → Allow. Then copy the long link at the top and paste it below."
        : "В новом окне: нажмите Kate Mobile → «Разрешить». Потом скопируйте длинную ссылку сверху и вставьте сюда."
    );
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
      if (data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
      }
      setVkPickOpen(false);
      setVkGroups([]);
      setVkToken("");
      setNotice(
        uiLang === "en" ? "VK community connected." : "Сообщество VK подключено."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function connectVkAny(rawToken?: string) {
    if (!projectId) return;
    const raw = (rawToken ?? vkToken).trim();
    const groupHint = vkGroupId.trim();
    if (!raw && !groupHint) {
      setError(
        uiLang === "en"
          ? "Paste the VK URL/token (and community link if needed)"
          : "Вставьте ссылку/токен VK (и ссылку на сообщество, если нужно)"
      );
      return;
    }
    setPending(true);
    setVkPickLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vk/connect-any", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          accessToken: raw || undefined,
          groupId: groupHint || undefined,
          raw: raw || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось подключить VK");

      if (data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
        setVkPickOpen(false);
        setVkGroups([]);
        setVkToken("");
        setVkGroupId("");
        setNotice(
          uiLang === "en"
            ? "VK connected — wall posting verified."
            : "VK подключён — публикация на стену проверена."
        );
        return;
      }

      if (data.pickGroups && Array.isArray(data.groups)) {
        setVkGroups(data.groups);
        setVkStubMode(Boolean(data.stub));
        setVkPickOpen(true);
        setVkToken("");
        setNotice(
          uiLang === "en"
            ? "Choose a community to publish to."
            : "Выберите сообщество для публикации."
        );
        return;
      }

      throw new Error(
        uiLang === "en" ? "Unexpected VK response" : "Неожиданный ответ VK"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setVkPickOpen(false);
    } finally {
      setPending(false);
      setVkPickLoading(false);
    }
  }

  async function importVkTokenAndPick(rawToken?: string) {
    await connectVkAny(rawToken);
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

  async function connectVkUserToken() {
    if (!projectId || !vkUserToken.trim()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/vk/user-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          accessToken: vkUserToken.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить токен");
      if (data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? data.project : p))
        );
      }
      setVkUserToken("");
      setNotice(
        uiLang === "en"
          ? "Personal VK token saved — photo upload enabled."
          : "Личный токен VK сохранён — загрузка фото включена."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function connectVkManual() {
    await connectVkAny();
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
            <BrandLogo />
          </Link>
          <div className={styles.projectBar}>
            <ThemeToggle
              labels={{ light: t.themeLight, dark: t.themeDark }}
            />
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
            <Link
              href="/plan/billing"
              className={styles.balanceChip}
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
            </Link>
            {isAdmin && (
              <Link href="/admin" className="btn btn-ghost">
                {t.adminNav}
              </Link>
            )}
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
          <div className={styles.cabinetShell}>
            <aside
              className={`${styles.sideNav} ${styles.desktopOnly}`}
              aria-label={t.navMenu}
            >
              <div className={styles.sideBiz}>
                <p className={styles.bizLabel}>{t.business}</p>
                <div className={styles.sideBizList}>
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={
                        p.id === projectId ? styles.sideBizOn : styles.sideBizChip
                      }
                      onClick={() => {
                        setProjectId(p.id);
                        localStorage.setItem(ACTIVE_KEY, p.id);
                        setSelectedDraftId(p.drafts[0]?.id ?? null);
                        const today = todayInZone(
                          p.brief.timezone || "Europe/Moscow"
                        );
                        const failed = p.drafts.filter(
                          (d) =>
                            d.status === "failed" || d.status === "rejected"
                        ).length;
                        const draftCount = p.drafts.filter((d) =>
                          matchesStatusFilter(d, "draft", today)
                        ).length;
                        const scheduled = p.drafts.filter(
                          (d) => d.status === "scheduled"
                        ).length;
                        const todayCount = p.drafts.filter(
                          (d) => d.day === today
                        ).length;
                        setPostsStatusFilter(
                          suggestPostsFilter({
                            failed,
                            draft: draftCount,
                            scheduled,
                            today: todayCount,
                          })
                        );
                        setPostsChannelFilter("all");
                        setPostsSearch("");
                        setPostsSort("soon");
                        setMobileEdit(false);
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

              {navGroups.map((group) => (
                <div key={group.id} className={styles.sideGroup}>
                  <p className={styles.sideGroupTitle}>{group.title}</p>
                  <div className={styles.sideItems}>
                    {group.items.map((item) => {
                      const badge =
                        item.key === "drafts" && postsStats.attention > 0
                          ? postsStats.attention
                          : 0;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={
                            step === item.key
                              ? styles.sideItemOn
                              : styles.sideItem
                          }
                          onClick={() => {
                            setStep(item.key);
                            setMobileEdit(false);
                          }}
                        >
                          <span className={styles.sideItemIcon}>
                            <NavGlyph tab={item.key} />
                          </span>
                          <span className={styles.sideItemText}>
                            <span className={styles.sideItemLabel}>
                              {item.label}
                            </span>
                            <span className={styles.sideItemHint}>
                              {item.hint}
                            </span>
                          </span>
                          {badge > 0 && (
                            <span className={styles.sideBadge}>{badge}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                type="button"
                className={styles.sideDanger}
                onClick={() => {
                  setDeleteOpen(true);
                  setDeleteConfirm("");
                  setError(null);
                }}
              >
                {t.delete}
              </button>
            </aside>

            <div className={styles.cabinetMain}>
              <div className={`${styles.bizSwitch} ${styles.mobileOnly}`}>
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
                        const today = todayInZone(
                          p.brief.timezone || "Europe/Moscow"
                        );
                        const failed = p.drafts.filter(
                          (d) =>
                            d.status === "failed" || d.status === "rejected"
                        ).length;
                        const draftCount = p.drafts.filter((d) =>
                          matchesStatusFilter(d, "draft", today)
                        ).length;
                        const scheduled = p.drafts.filter(
                          (d) => d.status === "scheduled"
                        ).length;
                        const todayCount = p.drafts.filter(
                          (d) => d.day === today
                        ).length;
                        setPostsStatusFilter(
                          suggestPostsFilter({
                            failed,
                            draft: draftCount,
                            scheduled,
                            today: todayCount,
                          })
                        );
                        setPostsChannelFilter("all");
                        setPostsSearch("");
                        setPostsSort("soon");
                        setMobileEdit(false);
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

              <div className={styles.pageHead}>
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
                  <span>
                    VK {project.channels.vk.connected ? "✓" : "—"}
                  </span>
                </div>
              </div>

              <div className={styles.layout}>
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
                        openBilling();
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
                  <Link href="/plan/billing" className="btn btn-ghost">
                    {uiLang === "en" ? "Top up" : "Пополнить"}
                  </Link>
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
                      {t.postsEyebrow}
                      {project.drafts.length
                        ? ` · ${project.drafts.length}`
                        : ""}
                    </p>
                    <h2>{t.postsTitle}</h2>
                    <p className={styles.postsLeadTight}>{t.postsLead}</p>
                  </div>
                  <div className={styles.summaryActions}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setStep("channels")}
                    >
                      {t.postsToChannels}
                    </button>
                    {project.plan && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={pending}
                        onClick={generateDrafts}
                      >
                        {pending
                          ? uiLang === "en"
                            ? "Building…"
                            : "Собираем…"
                          : project.drafts.length
                            ? t.postsRebuild
                            : t.postsBuild}
                      </button>
                    )}
                  </div>
                </div>
                {error && <p className={styles.error}>{error}</p>}

                {!project.drafts.length ? (
                  <div className={styles.emptyDash}>
                    {!project.plan ? (
                      <>
                        <p>
                          {uiLang === "en"
                            ? "Build a weekly plan first."
                            : "Сначала нужен план на неделю."}
                        </p>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setStep("brief")}
                        >
                          {uiLang === "en"
                            ? "Open business profile"
                            : "Открыть профиль бизнеса"}
                        </button>
                      </>
                    ) : (
                      <>
                        <p>
                          {uiLang === "en"
                            ? "Plan is ready — build texts in one click."
                            : "План есть — соберите тексты одним нажатием."}
                        </p>
                        <button
                          type="button"
                          className="btn"
                          disabled={pending}
                          onClick={generateDrafts}
                        >
                          {pending
                            ? uiLang === "en"
                              ? "Writing texts and photos…"
                              : "Пишем тексты и фото…"
                            : uiLang === "en"
                              ? "Build texts and photos"
                              : "Собрать тексты и фото"}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {(postsStats.failed > 0 ||
                      postsStats.draft > 0 ||
                      postsStats.nextQueued) && (
                      <div className={styles.postsFocusBar}>
                        {postsStats.failed > 0 ? (
                          <button
                            type="button"
                            className={styles.postsFocusUrgent}
                            onClick={() => {
                              setPostsStatusFilter("failed");
                              setPostsChannelFilter("all");
                              setPostsSearch("");
                            }}
                          >
                            <strong>
                              {postsStats.failed}{" "}
                              {uiLang === "en" ? "failed" : "с ошибкой"}
                            </strong>
                            <span>{t.postsAttentionCta}</span>
                          </button>
                        ) : postsStats.draft > 0 ? (
                          <button
                            type="button"
                            className={styles.postsFocusWarn}
                            onClick={() => {
                              setPostsStatusFilter("draft");
                              setPostsChannelFilter("all");
                              setPostsSearch("");
                            }}
                          >
                            <strong>
                              {postsStats.draft}{" "}
                              {uiLang === "en"
                                ? "drafts waiting"
                                : "черновиков ждут"}
                            </strong>
                            <span>{t.postsAttentionCta}</span>
                          </button>
                        ) : null}
                        {postsStats.nextQueued && (
                          <button
                            type="button"
                            className={styles.postsFocusNext}
                            onClick={() => {
                              setPostsStatusFilter("scheduled");
                              setPostsChannelFilter("all");
                              setPostsSearch("");
                              setSelectedDraftId(postsStats.nextQueued!.id);
                            }}
                          >
                            <span className={styles.postsFocusLabel}>
                              {t.postsNextUp}
                            </span>
                            <strong>
                              {channelLabel(postsStats.nextQueued.channel)} ·{" "}
                              {postsStats.nextQueued.day.slice(5)}{" "}
                              {postsStats.nextQueued.timeLocal.slice(0, 5)}
                            </strong>
                          </button>
                        )}
                      </div>
                    )}

                    <div className={styles.postsControlsSticky}>
                      <div className={styles.postsStats}>
                        {(
                          [
                            ["attention", t.postsFilterAttention, postsStats.attention],
                            ["today", t.postsFilterToday, postsStats.today],
                            ["draft", t.postsFilterDraft, postsStats.draft],
                            ["scheduled", t.postsFilterQueue, postsStats.scheduled],
                            ["published", t.postsFilterPublished, postsStats.published],
                            ["failed", t.postsFilterFailed, postsStats.failed],
                            ["all", t.postsFilterAll, postsStats.total],
                          ] as const
                        ).map(([id, label, count]) => (
                          <button
                            key={id}
                            type="button"
                            className={
                              postsStatusFilter === id
                                ? styles.postsStatOn
                                : styles.postsStat
                            }
                            data-filter={id}
                            onClick={() => setPostsStatusFilter(id)}
                          >
                            <strong>{count}</strong>
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>

                      <div className={styles.postsToolbar}>
                        <div className={styles.postsChannelFilters}>
                          <button
                            type="button"
                            className={
                              postsChannelFilter === "all"
                                ? styles.chipOn
                                : styles.chip
                            }
                            onClick={() => setPostsChannelFilter("all")}
                          >
                            {t.postsFilterAll}
                          </button>
                          {postsStats.channels.map(([ch, count]) => (
                            <button
                              key={ch}
                              type="button"
                              className={
                                postsChannelFilter === ch
                                  ? styles.chipOn
                                  : styles.chip
                              }
                              onClick={() => setPostsChannelFilter(ch)}
                            >
                              <span
                                className={styles.channelBadge}
                                data-channel={ch}
                              >
                                {channelLabel(ch)}
                              </span>
                              <span className={styles.chipCount}>{count}</span>
                            </button>
                          ))}
                        </div>
                        <div className={styles.postsToolbarRight}>
                          <div className={styles.postsSearchWrap}>
                            <input
                              className={styles.postsSearch}
                              value={postsSearch}
                              onChange={(e) => setPostsSearch(e.target.value)}
                              placeholder={t.postsSearchPh}
                              aria-label={t.postsSearchPh}
                            />
                            {postsSearch ? (
                              <button
                                type="button"
                                className={styles.postsSearchClear}
                                onClick={() => setPostsSearch("")}
                                aria-label={t.postsClearSearch}
                              >
                                ×
                              </button>
                            ) : null}
                          </div>
                          <select
                            className={styles.postsSort}
                            value={postsSort}
                            onChange={(e) =>
                              setPostsSort(e.target.value as PostsSort)
                            }
                            aria-label={
                              uiLang === "en" ? "Sort" : "Сортировка"
                            }
                          >
                            <option value="soon">{t.postsSortSoon}</option>
                            <option value="latest">{t.postsSortLatest}</option>
                            <option value="channel">
                              {t.postsSortChannel}
                            </option>
                          </select>
                        </div>
                      </div>

                      <div className={styles.postsMetaRow}>
                        <span>
                          {t.postsShowing}{" "}
                          <strong>{filteredDrafts.length}</strong> {t.postsOf}{" "}
                          {postsStats.total}
                        </span>
                        <span className={styles.postsHint}>{t.postsHintEdit}</span>
                        {postsFiltersActive ? (
                          <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={() => {
                              setPostsChannelFilter("all");
                              setPostsStatusFilter("all");
                              setPostsSearch("");
                            }}
                          >
                            {t.postsResetFilters}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {!filteredDrafts.length ? (
                      <div className={styles.emptyDash}>
                        <p>{t.postsEmptyFilter}</p>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setPostsChannelFilter("all");
                            setPostsStatusFilter("all");
                            setPostsSearch("");
                          }}
                        >
                          {t.postsResetFilters}
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`${styles.contentGrid} ${
                          mobileEdit ? styles.contentEditing : ""
                        }`}
                      >
                        <div
                          className={`${styles.tableWrap} ${styles.desktopOnly}`}
                        >
                          <table className={styles.contentTable}>
                            <thead>
                              <tr>
                                <th>{t.postsColWhen}</th>
                                <th>{t.postsColChannel}</th>
                                <th>{t.postsColTopic}</th>
                                <th>{t.postsColStatus}</th>
                                <th>{t.postsColActions}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredDraftGroups.map((group) => (
                                <Fragment key={group.key}>
                                  <tr className={styles.dayGroupRow}>
                                    <td colSpan={5}>
                                      <div className={styles.dayGroupHead}>
                                        <strong>{group.label}</strong>
                                        <span>
                                          {group.items.length}{" "}
                                          {uiLang === "en" ? "posts" : "пост."}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                  {group.items.map((draft) => {
                                    const active =
                                      (selectedDraft?.id ?? null) ===
                                      draft.id;
                                    const locked =
                                      draft.status === "published";
                                    const action = nextPostAction(
                                      draft,
                                      uiLang
                                    );
                                    const urgent =
                                      draft.status === "failed" ||
                                      draft.status === "rejected";
                                    return (
                                      <tr
                                        key={draft.id}
                                        className={[
                                          active ? styles.rowActive : "",
                                          urgent ? styles.rowUrgent : "",
                                        ]
                                          .filter(Boolean)
                                          .join(" ") || undefined}
                                        onClick={() =>
                                          setSelectedDraftId(draft.id)
                                        }
                                      >
                                        <td>
                                          <div className={styles.cellMain}>
                                            {draft.timeLocal.slice(0, 5)}
                                          </div>
                                          <div className={styles.cellSub}>
                                            {draft.day.slice(5)}
                                          </div>
                                        </td>
                                        <td>
                                          <span
                                            className={styles.channelBadge}
                                            data-channel={draft.channel}
                                          >
                                            {channelLabel(draft.channel)}
                                          </span>
                                          {!isChannelConnected(
                                            project.channels,
                                            draft.channel
                                          ) &&
                                          WORKING_CHANNELS.has(
                                            draft.channel
                                          ) ? (
                                            <div
                                              className={styles.cellWarn}
                                            >
                                              {t.postsChannelOff}
                                            </div>
                                          ) : null}
                                        </td>
                                        <td>
                                          <div className={styles.cellMain}>
                                            {draft.title || draft.topic}
                                          </div>
                                          <div className={styles.cellSub}>
                                            {mediaLabel(draft, t)}
                                            {" · "}
                                            {draft.body.slice(0, 56)}
                                            {draft.body.length > 56
                                              ? "…"
                                              : ""}
                                          </div>
                                        </td>
                                        <td>
                                          <span
                                            className={styles.status}
                                            data-status={draft.status}
                                          >
                                            {statusLabel(
                                              draft.status,
                                              uiLang
                                            )}
                                          </span>
                                          {draft.publishError ? (
                                            <div className={styles.cellWarn}>
                                              {draft.publishError.slice(
                                                0,
                                                48
                                              )}
                                            </div>
                                          ) : null}
                                        </td>
                                        <td
                                          className={styles.rowActions}
                                          onClick={(e) =>
                                            e.stopPropagation()
                                          }
                                        >
                                          {action.kind === "done" ? (
                                            <span
                                              className={styles.rowDone}
                                            >
                                              {action.label}
                                            </span>
                                          ) : (
                                            <button
                                              type="button"
                                              className={
                                                action.kind === "fix"
                                                  ? styles.rowActionPrimaryUrgent
                                                  : styles.rowActionPrimary
                                              }
                                              disabled={
                                                locked ||
                                                busyId === draft.id
                                              }
                                              onClick={() => {
                                                setSelectedDraftId(draft.id);
                                                if (action.kind === "fix") {
                                                  void publishDraft(draft);
                                                } else if (
                                                  action.kind === "schedule"
                                                ) {
                                                  scheduleDraft(draft);
                                                } else if (
                                                  action.kind === "publish"
                                                ) {
                                                  void publishDraft(draft);
                                                }
                                              }}
                                            >
                                              {busyId === draft.id
                                                ? "…"
                                                : action.label}
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div
                          className={`${styles.mobileList} ${styles.mobileOnly}`}
                        >
                          {filteredDraftGroups.map((group) => (
                            <div
                              key={group.key}
                              className={styles.mobileGroup}
                            >
                              <div className={styles.dayGroupHead}>
                                <strong>{group.label}</strong>
                                <span>{group.items.length}</span>
                              </div>
                              {group.items.map((draft) => {
                                const active =
                                  (selectedDraft?.id ?? null) === draft.id;
                                const action = nextPostAction(
                                  draft,
                                  uiLang
                                );
                                return (
                                  <div
                                    key={draft.id}
                                    className={
                                      active
                                        ? styles.mobileCardOn
                                        : styles.mobileCard
                                    }
                                  >
                                    <button
                                      type="button"
                                      className={styles.mobileCardHit}
                                      onClick={() => {
                                        setSelectedDraftId(draft.id);
                                        setMobileEdit(true);
                                      }}
                                    >
                                      <div className={styles.mobileCardTop}>
                                        <span>
                                          {draft.timeLocal.slice(0, 5)} ·{" "}
                                          {channelLabel(draft.channel)}
                                        </span>
                                        <span
                                          className={styles.status}
                                          data-status={draft.status}
                                        >
                                          {statusLabel(
                                            draft.status,
                                            uiLang
                                          )}
                                        </span>
                                      </div>
                                      <strong
                                        className={styles.mobileCardTitle}
                                      >
                                        {draft.title || draft.topic}
                                      </strong>
                                    </button>
                                    {action.kind !== "done" ? (
                                      <button
                                        type="button"
                                        className={styles.mobilePrimary}
                                        disabled={busyId === draft.id}
                                        onClick={() => {
                                          setSelectedDraftId(draft.id);
                                          if (
                                            action.kind === "fix" ||
                                            action.kind === "publish"
                                          ) {
                                            void publishDraft(draft);
                                          } else {
                                            scheduleDraft(draft);
                                          }
                                        }}
                                      >
                                        {busyId === draft.id
                                          ? "…"
                                          : action.label}
                                      </button>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>

                        {selectedDraft && (
                          <aside
                            className={`${styles.draftPanel} ${
                              mobileEdit ? styles.draftPanelOpen : ""
                            }`}
                          >
                            {(() => {
                              const draft = selectedDraft;
                              const canAutoPublish = canPublishChannel(
                                draft.channel
                              );
                              const locked = draft.status === "published";
                              const connected = isChannelConnected(
                                project.channels,
                                draft.channel
                              );
                              const action = nextPostAction(draft, uiLang);
                              return (
                                <>
                                  <header className={styles.draftPanelHead}>
                                    <div>
                                      <button
                                        type="button"
                                        className={`${styles.backMobile} ${styles.mobileOnly}`}
                                        onClick={() => setMobileEdit(false)}
                                      >
                                        {t.postsBackList}
                                      </button>
                                      <p className="eyebrow">
                                        {channelLabel(draft.channel)} ·{" "}
                                        {draft.timeLocal.slice(0, 5)}
                                      </p>
                                      <h3>{draft.topic}</h3>
                                    </div>
                                    <span
                                      className={styles.status}
                                      data-status={draft.status}
                                    >
                                      {statusLabel(draft.status, uiLang)}
                                    </span>
                                  </header>

                                  {!connected &&
                                    WORKING_CHANNELS.has(draft.channel) && (
                                      <div className={styles.channelOffNote}>
                                        <span>{t.postsChannelOff}</span>
                                        <button
                                          type="button"
                                          className={styles.linkBtn}
                                          onClick={() => setStep("channels")}
                                        >
                                          {t.postsChannelOffCta}
                                        </button>
                                      </div>
                                    )}

                                  <label className={styles.field}>
                                    <span className={styles.fieldLabel}>
                                      {uiLang === "en" ? "Channel" : "Куда"}
                                    </span>
                                    <select
                                      className={styles.fieldControl}
                                      value={draft.channel}
                                      disabled={locked}
                                      onChange={(e) =>
                                        updateDraft(draft.id, {
                                          channel: e.target
                                            .value as Channel,
                                          status:
                                            draft.status === "published"
                                              ? draft.status
                                              : "draft",
                                          publishError: undefined,
                                        })
                                      }
                                    >
                                      {CHANNELS.map((ch) => (
                                        <option key={ch.id} value={ch.id}>
                                          {ch.label}
                                          {!WORKING_CHANNELS.has(ch.id)
                                            ? ` (${t.soon})`
                                            : ""}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className={styles.field}>
                                    <span className={styles.fieldLabel}>
                                      {uiLang === "en" ? "Title" : "Заголовок"}
                                    </span>
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
                                    <span className={styles.fieldLabel}>
                                      {uiLang === "en" ? "Text" : "Текст"}
                                    </span>
                                    <textarea
                                      className={styles.fieldControl}
                                      rows={14}
                                      value={draft.body}
                                      disabled={locked}
                                      onChange={(e) =>
                                        updateDraft(draft.id, {
                                          body: e.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                  {!locked && (
                                    <button
                                      type="button"
                                      className="btn btn-ghost"
                                      disabled={busyId === draft.id}
                                      onClick={() =>
                                        rewriteDraftText(draft.id)
                                      }
                                    >
                                      {busyId === draft.id
                                        ? uiLang === "en"
                                          ? "Rewriting…"
                                          : "Переписываем…"
                                        : uiLang === "en"
                                          ? `Rewrite text · ${rewritePriceRub} ₽`
                                          : `Переписать текст · ${rewritePriceRub} ₽`}
                                    </button>
                                  )}

                                  <div className={styles.scheduleRow}>
                                    <label className={styles.field}>
                                      <span className={styles.fieldLabel}>
                                        {uiLang === "en" ? "Date" : "Дата"}
                                      </span>
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
                                      <span className={styles.fieldLabel}>
                                        {uiLang === "en" ? "Time" : "Время"}
                                      </span>
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
                                          ? "Threads: text only"
                                          : draft.channel === "instagram"
                                            ? draft.imagePath
                                              ? "Instagram: photo + caption"
                                              : uiLang === "en"
                                                ? "Instagram needs a photo"
                                                : "Instagram: нужно фото"
                                            : draft.needsPhoto
                                              ? uiLang === "en"
                                                ? "Photo marked — create below"
                                                : "Нужно фото — создайте ниже"
                                              : uiLang === "en"
                                                ? "No photo needed"
                                                : "Фото не нужно"}
                                      </p>
                                    )}
                                    {draft.channel !== "threads" &&
                                      (draft.needsPhoto ||
                                        draft.imagePath) && (
                                        <button
                                          type="button"
                                          className="btn btn-ghost"
                                          disabled={
                                            locked || busyId === draft.id
                                          }
                                          onClick={() =>
                                            generateDraftImage(draft.id)
                                          }
                                        >
                                          {busyId === draft.id
                                            ? "…"
                                            : draft.imagePath
                                              ? uiLang === "en"
                                                ? `New photo · ${imagePriceRub} ₽`
                                                : `Новое фото · ${imagePriceRub} ₽`
                                              : uiLang === "en"
                                                ? `Create photo · ${imagePriceRub} ₽`
                                                : `Создать фото · ${imagePriceRub} ₽`}
                                        </button>
                                      )}
                                    {draft.channel !== "threads" &&
                                      draft.channel !== "instagram" &&
                                      !draft.needsPhoto &&
                                      !draft.imagePath && (
                                        <button
                                          type="button"
                                          className="btn btn-ghost"
                                          disabled={
                                            locked || busyId === draft.id
                                          }
                                          onClick={() =>
                                            generateDraftImage(draft.id)
                                          }
                                        >
                                          {busyId === draft.id
                                            ? "…"
                                            : uiLang === "en"
                                              ? `Create photo · ${imagePriceRub} ₽`
                                              : `Создать фото · ${imagePriceRub} ₽`}
                                        </button>
                                      )}
                                    {draft.channel !== "threads" &&
                                      draft.channel !== "instagram" && (
                                        <button
                                          type="button"
                                          className="btn btn-ghost"
                                          disabled={
                                            locked || busyId === draft.id
                                          }
                                          onClick={() =>
                                            generateDraftVideo(draft.id)
                                          }
                                        >
                                          {busyId === draft.id
                                            ? "…"
                                            : draft.videoPath
                                              ? uiLang === "en"
                                                ? "New video"
                                                : "Новое видео"
                                              : uiLang === "en"
                                                ? "Generate video"
                                                : "Сгенерировать видео"}
                                        </button>
                                      )}
                                  </div>

                                  {draft.publishError && (
                                    <p className={styles.error}>
                                      {draft.publishError}
                                    </p>
                                  )}

                                  <div className={styles.draftActionsSticky}>
                                    {action.kind !== "done" && (
                                      <button
                                        type="button"
                                        className="btn"
                                        disabled={
                                          locked || busyId === draft.id
                                        }
                                        onClick={() => {
                                          if (
                                            action.kind === "fix" ||
                                            action.kind === "publish"
                                          ) {
                                            void publishDraft(draft);
                                          } else {
                                            scheduleDraft(draft);
                                          }
                                        }}
                                      >
                                        {busyId === draft.id
                                          ? "…"
                                          : action.label}
                                      </button>
                                    )}
                                    {!locked &&
                                      draft.status !== "draft" && (
                                        <button
                                          type="button"
                                          className="btn btn-ghost"
                                          onClick={() =>
                                            updateDraft(draft.id, {
                                              status: "draft",
                                              publishError: undefined,
                                            })
                                          }
                                        >
                                          {t.postsToDraft}
                                        </button>
                                      )}
                                    {!locked &&
                                      action.kind === "schedule" &&
                                      canAutoPublish && (
                                        <button
                                          type="button"
                                          className="btn btn-ghost"
                                          disabled={busyId === draft.id}
                                          onClick={() =>
                                            publishDraft(draft)
                                          }
                                        >
                                          {t.postsPublishNow}
                                        </button>
                                      )}
                                    {!locked &&
                                      draft.status === "scheduled" && (
                                        <button
                                          type="button"
                                          className="btn btn-ghost"
                                          onClick={() =>
                                            scheduleDraft(draft)
                                          }
                                        >
                                          {t.postsInSchedule}
                                        </button>
                                      )}
                                    {!locked &&
                                      draft.status !== "rejected" && (
                                        <button
                                          type="button"
                                          className="btn btn-ghost"
                                          onClick={() =>
                                            updateDraft(draft.id, {
                                              status: "rejected",
                                            })
                                          }
                                        >
                                          {t.postsReject}
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
                  </>
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
                        steps={uiLang === "en" ? VK_HELP_EN : VK_HELP}
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
                        {!project.channels.vk.isStub && (
                          <details className={styles.full}>
                            <summary className={styles.fieldHint}>
                              {uiLang === "en"
                                ? "Reconnect / change community"
                                : "Подключить другое сообщество"}
                            </summary>
                            <p className={styles.fieldHint}>
                              {uiLang === "en"
                                ? "Open VK login, click Allow, then paste the long link from the top of that window here."
                                : "Откройте вход VK, нажмите «Разрешить», затем вставьте сюда длинную ссылку из верхней части того окна."}
                            </p>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={pending}
                              onClick={openVkHost}
                            >
                              {uiLang === "en"
                                ? "Open VK login again"
                                : "Снова открыть вход VK"}
                            </button>
                            <label className={styles.full}>
                              {uiLang === "en"
                                ? "Paste the long link here"
                                : "Вставьте длинную ссылку сюда"}
                              <input
                                value={vkToken}
                                onChange={(e) => setVkToken(e.target.value)}
                                placeholder="https://oauth.vk.com/..."
                                autoComplete="off"
                              />
                            </label>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={pending || !vkToken.trim()}
                              onClick={() => void connectVkAny()}
                            >
                              {uiLang === "en" ? "Continue" : "Продолжить"}
                            </button>
                          </details>
                        )}
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
                        <div className={`${styles.full} ${styles.billingHint}`}>
                          {uiLang === "en"
                            ? "To post to VK we need your permission once. It takes about a minute — follow the three steps."
                            : "Чтобы публиковать во ВКонтакте, один раз нужно разрешение. Это займёт около минуты — три простых шага."}
                        </div>

                        <ol className={styles.helpList}>
                          <li>
                            {uiLang === "en"
                              ? "Open the VK window and click Allow (use the account that manages your community)."
                              : "Откройте окно VK и нажмите «Разрешить» (аккаунт, которым вы управляете сообществом)."}
                          </li>
                          <li>
                            {uiLang === "en"
                              ? "Copy the long link at the top of that window (it starts with oauth.vk.com)."
                              : "Скопируйте длинную ссылку сверху того окна (она начинается с oauth.vk.com)."}
                          </li>
                          <li>
                            {uiLang === "en"
                              ? "Paste it into the field below and choose your community."
                              : "Вставьте её в поле ниже и выберите своё сообщество."}
                          </li>
                        </ol>

                        <div className={styles.channelActions}>
                          <button
                            type="button"
                            className="btn"
                            disabled={pending || vkPickLoading}
                            onClick={openVkHost}
                          >
                            {uiLang === "en"
                              ? "1. Open VK login"
                              : "1. Открыть вход VK"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={pending || vkPickLoading}
                            onClick={openVkLogin}
                          >
                            {uiLang === "en"
                              ? "Another window"
                              : "Другое окно входа"}
                          </button>
                        </div>

                        <label className={styles.full}>
                          {uiLang === "en"
                            ? "2. Paste the long link here"
                            : "2. Вставьте длинную ссылку сюда"}
                          <input
                            value={vkToken}
                            onChange={(e) => setVkToken(e.target.value)}
                            onPaste={(e) => {
                              const text = e.clipboardData.getData("text");
                              if (/access_token=/i.test(text)) {
                                e.preventDefault();
                                setVkToken(text.trim());
                                void connectVkAny(text.trim());
                              }
                            }}
                            placeholder={
                              uiLang === "en"
                                ? "Paste here (Ctrl+V) — link starts with https://oauth.vk.com/..."
                                : "Вставьте сюда (Ctrl+V) — ссылка начинается с https://oauth.vk.com/..."
                            }
                            autoComplete="off"
                          />
                          <span className={styles.fieldHint}>
                            {uiLang === "en"
                              ? "If VK warns you not to share the link with strangers — paste it only into this field in SMM-Agents. That’s safe."
                              : "Если VK предупредит «не передавайте ссылку посторонним» — вставьте её только в это поле в SMM-Agents. Так безопасно."}
                          </span>
                        </label>

                        <button
                          type="button"
                          className="btn"
                          disabled={
                            pending || vkPickLoading || !vkToken.trim()
                          }
                          onClick={() => void connectVkAny()}
                        >
                          {vkPickLoading
                            ? uiLang === "en"
                              ? "Loading your communities…"
                              : "Загружаем ваши сообщества…"
                            : uiLang === "en"
                              ? "3. Continue — choose community"
                              : "3. Продолжить — выбрать сообщество"}
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

            {step === "bots" && project && (
              <BotsPanel
                uiLang={uiLang}
                projectId={project.id}
                vkConnected={Boolean(project.channels.vk.connected)}
                telegramConnected={Boolean(project.channels.telegram.connected)}
                bots={{
                  vk: project.bots?.vk ?? {
                    enabled: false,
                    mode: "faq",
                    paidUntil: null,
                    faq: [],
                    hasVkCallback: false,
                    paidActive: false,
                    lastWebhookAt: null,
                    lastWebhookType: null,
                    lastWebhookNote: null,
                  },
                  telegram: project.bots?.telegram ?? {
                    enabled: false,
                    mode: "faq",
                    paidUntil: null,
                    faq: [],
                    hasVkCallback: false,
                    paidActive: false,
                    lastWebhookAt: null,
                    lastWebhookType: null,
                    lastWebhookNote: null,
                  },
                }}
                botReplies={project.botReplies ?? []}
                prices={{
                  botVkPeriodRub,
                  botTgPeriodRub,
                  botFaqReplyRub,
                  botAiReplyRub,
                  botPeriodDays,
                }}
                pending={pending}
                balanceRub={balanceRub}
                onBusy={setPending}
                onError={setError}
                onNotice={setNotice}
                onNeedBilling={() => openBilling()}
                onGoChannels={() => setStep("channels")}
                onProject={(p) => {
                  const proj = p as PublicProject;
                  setProjects((prev) =>
                    prev.map((x) => (x.id === proj.id ? { ...x, ...proj } : x))
                  );
                  if (typeof (p as { billing?: { balanceRub?: number } }).billing?.balanceRub === "number") {
                    /* no-op */
                  }
                  void refreshBilling();
                }}
              />
            )}
              </div>
            </div>
          </div>

          <nav className={styles.bottomNav} aria-label={t.navMenu}>
            {NAV.map(({ key, short }) => {
              const badge =
                key === "drafts" && postsStats.attention > 0
                  ? postsStats.attention
                  : 0;
              return (
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
                  <span className={styles.bottomNavIcon}>
                    <NavGlyph tab={key} />
                    {badge > 0 && (
                      <span className={styles.bottomNavBadge}>{badge}</span>
                    )}
                  </span>
                  <span className={styles.bottomNavLabel}>{short}</span>
                </button>
              );
            })}
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
                  {uiLang === "en"
                    ? "Where should we post?"
                    : "Куда публиковать посты?"}
                </h2>
                <p>
                  {vkStubMode
                    ? uiLang === "en"
                      ? "Demo mode — pick a test community."
                      : "Тестовый режим — выберите пробное сообщество."
                    : uiLang === "en"
                      ? "Tap your community. Posts will go to its wall."
                      : "Нажмите на своё сообщество. Посты будут выходить на его стену."}
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

    </main>
  );
}
