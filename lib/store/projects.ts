import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BrandBrief, Channel, ContentPlan } from "@/lib/marketer/types";
import type { PostDraft } from "@/lib/smm/types";
import { hashPassword, verifyPassword } from "@/lib/auth/session";
import {
  BOT_AI_REPLY_RUB,
  BOT_FAQ_REPLY_RUB,
  BOT_PERIOD_DAYS,
  BOT_TG_PERIOD_RUB,
  BOT_VK_PERIOD_RUB,
  NEW_USER_BONUS_RUB,
  POST_PRICE_RUB,
  REGENERATE_IMAGE_PRICE_RUB,
  REWRITE_TEXT_PRICE_RUB,
  TOPUP_PRESETS_RUB,
} from "@/lib/billing/pricing";
import {
  defaultCommentBot,
  toPublicCommentBot,
  type BotChannel,
  type BotReplyLog,
  type BotReplyMode,
  type CommentBot,
  type FaqItem,
  type ProjectBots,
} from "@/lib/bots/types";

export type {
  BotChannel,
  BotReplyLog,
  BotReplyMode,
  CommentBot,
  FaqItem,
  ProjectBots,
};

export type LedgerEntry = {
  id: string;
  userId: string;
  type: "topup" | "charge" | "adjust";
  amountRub: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  yooPaymentId?: string;
  projectId?: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  /** Баланс в рублях */
  balanceRub: number;
  /** Персональный промокод / реф-код */
  referralCode: string;
  /** Кто пригласил (userId) */
  referredByUserId?: string;
  /** Какой промокод ввёл при регистрации */
  promoCodeUsed?: string;
};

export type StoreSettings = {
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

export type PendingTopUp = {
  id: string;
  userId: string;
  amountRub: number;
  yooPaymentId: string;
  status: "pending" | "succeeded" | "canceled";
  createdAt: string;
};

export type PendingVkAuth = {
  projectId: string;
  userId: string;
  accessToken: string;
  vkUserId: number;
  expiresAt?: string;
  isStub?: boolean;
  createdAt: string;
};

/** PKCE-сессия VK ID (state без точек — VK может их убрать из URL). */
export type PendingVkOAuthFlow = {
  state: string;
  projectId: string;
  userId: string;
  codeVerifier: string;
  redirectUri?: string;
  /** connect — выбор сообщества; photo — личный токен для загрузки фото */
  purpose?: "connect" | "photo";
  createdAt: string;
};

/** Выдача токена сообщества через oauth.vk.com (implicit). */
export type PendingVkCommunityFlow = {
  state: string;
  projectId: string;
  userId: string;
  groupId: string;
  createdAt: string;
};

export type TelegramConnection = {
  botToken: string;
  chatId: string;
  connectedAt: string;
};

export type VkConnection = {
  accessToken: string;
  groupId: string;
  groupName?: string;
  vkUserId?: number;
  /** Личный токен администратора — для загрузки фото на стену */
  userAccessToken?: string;
  connectedAt: string;
  expiresAt?: string;
  isStub?: boolean;
};

export type FacebookConnection = {
  userAccessToken: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  connectedAt: string;
  expiresAt?: string;
  /** Тестовая заглушка без реального Meta */
  isStub?: boolean;
};

export type InstagramConnection = {
  userAccessToken: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igUserId: string;
  connectedAt: string;
  expiresAt?: string;
  isStub?: boolean;
};

export type ThreadsConnection = {
  accessToken: string;
  threadsUserId: string;
  username?: string;
  connectedAt: string;
  expiresAt?: string;
  isStub?: boolean;
};

export type XConnection = {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  username?: string;
  name?: string;
  connectedAt: string;
  expiresAt?: string;
};

export type ProjectChannels = {
  telegram?: TelegramConnection;
  vk?: VkConnection;
  facebook?: FacebookConnection;
  instagram?: InstagramConnection;
  threads?: ThreadsConnection;
  x?: XConnection;
};

/** Фоновая генерация плана — переживает обновление страницы */
export type PlanJob = {
  status: "running" | "failed";
  startedAt: string;
  error?: string;
  chargedRub?: number;
  postsCount?: number;
  balanceRub?: number;
};

/** Фоновая генерация текстов постов — переживает обновление страницы */
export type DraftsJob = {
  status: "running" | "failed";
  startedAt: string;
  phase?: "texts" | "photos";
  photoDone?: number;
  photoTotal?: number;
  error?: string;
};

/** Pending VK user OAuth (authorization code). */
export type PendingVkUserFlow = {
  state: string;
  projectId: string;
  userId: string;
  redirectUri?: string;
  createdAt: string;
};

export type Project = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  brief: BrandBrief;
  channels: ProjectChannels;
  bots?: ProjectBots;
  botReplies?: BotReplyLog[];
  plan: ContentPlan | null;
  planSource: "deepseek" | "local" | null;
  planJob?: PlanJob | null;
  drafts: PostDraft[];
  draftsSource: "deepseek" | "local" | null;
  draftsJob?: DraftsJob | null;
};

export type TrashedProject = Project & {
  deletedAt: string;
};

type StoreFile = {
  version: 5;
  users: User[];
  projects: Project[];
  trash: TrashedProject[];
  ledger: LedgerEntry[];
  pendingTopUps: PendingTopUp[];
  settings?: StoreSettings;
  pendingVkAuth?: PendingVkAuth[];
  pendingVkOAuth?: PendingVkOAuthFlow[];
  pendingVkCommunity?: PendingVkCommunityFlow[];
  pendingVkUser?: PendingVkUserFlow[];
};

const DATA_DIR = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "store.json");

function defaultBrief(name = ""): BrandBrief {
  return {
    brandName: name,
    niche: "",
    geo: "",
    language: "ru",
    timezone: "Europe/Moscow",
    audience: {
      who: "",
      pain: "",
      desire: "",
    },
    toneOfVoice: [],
    offer: "",
    websiteUrl: "",
    ctaOptions: ["Написать в комментарии", "Перейти на сайт", "Узнать подробнее"],
    facts: {},
    channels: ["telegram"],
    postsPerDay: 1,
    postsPerWeek: 7,
    taboos: [],
    startDate: new Date().toISOString().slice(0, 10),
  };
}

function defaultSettings(): StoreSettings {
  return {
    newUserBonusRub: NEW_USER_BONUS_RUB,
    referralPercent: 10,
    postPriceRub: POST_PRICE_RUB,
    rewritePriceRub: REWRITE_TEXT_PRICE_RUB,
    imagePriceRub: REGENERATE_IMAGE_PRICE_RUB,
    botVkPeriodRub: BOT_VK_PERIOD_RUB,
    botTgPeriodRub: BOT_TG_PERIOD_RUB,
    botAiReplyRub: BOT_AI_REPLY_RUB,
    botFaqReplyRub: BOT_FAQ_REPLY_RUB,
    botPeriodDays: BOT_PERIOD_DAYS,
    topupPresetsRub: [...TOPUP_PRESETS_RUB],
  };
}

function emptyStore(): StoreFile {
  return {
    version: 5,
    users: [],
    projects: [],
    trash: [],
    ledger: [],
    pendingTopUps: [],
    settings: defaultSettings(),
    pendingVkAuth: [],
    pendingVkOAuth: [],
    pendingVkCommunity: [],
    pendingVkUser: [],
  };
}

function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function generateReferralCode(existing: Set<string>): string {
  for (let i = 0; i < 40; i++) {
    const code = `SA-${randomBytes(3).toString("hex").toUpperCase()}`;
    if (!existing.has(code)) return code;
  }
  return `SA-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function mergeSettings(partial?: Partial<StoreSettings> | null): StoreSettings {
  const base = defaultSettings();
  if (!partial) return base;
  return {
    newUserBonusRub:
      typeof partial.newUserBonusRub === "number"
        ? Math.max(0, Math.round(partial.newUserBonusRub))
        : base.newUserBonusRub,
    referralPercent:
      typeof partial.referralPercent === "number"
        ? Math.min(50, Math.max(0, partial.referralPercent))
        : base.referralPercent,
    postPriceRub:
      typeof partial.postPriceRub === "number"
        ? Math.max(0, Math.round(partial.postPriceRub))
        : base.postPriceRub,
    rewritePriceRub:
      typeof partial.rewritePriceRub === "number"
        ? Math.max(0, Math.round(partial.rewritePriceRub))
        : base.rewritePriceRub,
    imagePriceRub:
      typeof partial.imagePriceRub === "number"
        ? Math.max(0, Math.round(partial.imagePriceRub))
        : base.imagePriceRub,
    botVkPeriodRub:
      typeof partial.botVkPeriodRub === "number"
        ? Math.max(0, Math.round(partial.botVkPeriodRub))
        : base.botVkPeriodRub,
    botTgPeriodRub:
      typeof partial.botTgPeriodRub === "number"
        ? Math.max(0, Math.round(partial.botTgPeriodRub))
        : base.botTgPeriodRub,
    botAiReplyRub:
      typeof partial.botAiReplyRub === "number"
        ? Math.max(0, Math.round(partial.botAiReplyRub))
        : base.botAiReplyRub,
    botFaqReplyRub:
      typeof partial.botFaqReplyRub === "number"
        ? Math.max(0, Math.round(partial.botFaqReplyRub))
        : base.botFaqReplyRub,
    botPeriodDays:
      typeof partial.botPeriodDays === "number"
        ? Math.max(1, Math.round(partial.botPeriodDays))
        : base.botPeriodDays,
    topupPresetsRub: (() => {
      if (!Array.isArray(partial.topupPresetsRub)) return base.topupPresetsRub;
      const next = partial.topupPresetsRub
        .map((n) => Math.round(Number(n)))
        .filter((n) => n >= 50 && n <= 100_000)
        .slice(0, 12);
      return next.length ? next : base.topupPresetsRub;
    })(),
  };
}

function ensureStore(): StoreFile {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(STORE_PATH)) {
    const initial = emptyStore();
    writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const raw = readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreFile & {
      version?: number;
      trash?: TrashedProject[];
      ledger?: LedgerEntry[];
      pendingTopUps?: PendingTopUp[];
      settings?: Partial<StoreSettings>;
      pendingVkAuth?: PendingVkAuth[];
      pendingVkOAuth?: PendingVkOAuthFlow[];
      pendingVkCommunity?: PendingVkCommunityFlow[];
      pendingVkUser?: PendingVkUserFlow[];
    };
    if (!parsed.users) parsed.users = [];
    if (!parsed.projects) parsed.projects = [];
    if (!parsed.trash) parsed.trash = [];
    if (!parsed.ledger) parsed.ledger = [];
    if (!parsed.pendingTopUps) parsed.pendingTopUps = [];
    if (!parsed.pendingVkAuth) parsed.pendingVkAuth = [];
    if (!parsed.pendingVkOAuth) parsed.pendingVkOAuth = [];
    if (!parsed.pendingVkCommunity) parsed.pendingVkCommunity = [];
    if (!parsed.pendingVkUser) parsed.pendingVkUser = [];
    parsed.settings = mergeSettings(parsed.settings);
    parsed.projects = parsed.projects.map((p) => ({
      ...p,
      userId: (p as Project).userId || "",
      bots: (p as Project).bots ?? {},
      botReplies: Array.isArray((p as Project).botReplies)
        ? (p as Project).botReplies
        : [],
    }));
    const codes = new Set<string>();
    let usersMigrated = false;
    parsed.users = parsed.users.map((u) => {
      let referralCode = (u as User).referralCode
        ? normalizeReferralCode((u as User).referralCode)
        : "";
      if (!referralCode || codes.has(referralCode)) {
        referralCode = generateReferralCode(codes);
        usersMigrated = true;
      }
      codes.add(referralCode);
      if (!(u as User).referralCode) usersMigrated = true;
      return {
        ...u,
        balanceRub:
          typeof (u as User).balanceRub === "number"
            ? (u as User).balanceRub
            : 0,
        referralCode,
        referredByUserId: (u as User).referredByUserId || undefined,
        promoCodeUsed: (u as User).promoCodeUsed || undefined,
      };
    });
    parsed.version = 5;
    const store = parsed as StoreFile;
    if (usersMigrated || !parsed.settings || (parsed.version as number) < 5) {
      saveStore(store);
    }
    return store;
  } catch {
    return emptyStore();
  }
}

function saveStore(store: StoreFile) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function touch(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function registerUser(input: {
  email: string;
  password: string;
  name: string;
  promoCode?: string;
}): { ok: true; user: PublicUser } | { ok: false; error: string } {
  const email = normalizeEmail(input.email);
  const name = input.name.trim() || "Пользователь";
  const password = input.password;

  if (!email.includes("@") || email.length < 5) {
    return { ok: false, error: "Введите корректный email" };
  }
  if (password.length < 6) {
    return { ok: false, error: "Пароль должен быть не короче 6 символов" };
  }

  const store = ensureStore();
  if (store.users.some((u) => u.email === email)) {
    return { ok: false, error: "Этот email уже зарегистрирован" };
  }

  const settings = mergeSettings(store.settings);
  const promoRaw = input.promoCode ? normalizeReferralCode(input.promoCode) : "";
  let referredByUserId: string | undefined;
  let promoCodeUsed: string | undefined;
  if (promoRaw) {
    const referrer = store.users.find(
      (u) => normalizeReferralCode(u.referralCode) === promoRaw
    );
    if (!referrer) {
      return { ok: false, error: "Промокод не найден" };
    }
    if (referrer.email === email) {
      return { ok: false, error: "Нельзя использовать свой промокод" };
    }
    referredByUserId = referrer.id;
    promoCodeUsed = referrer.referralCode;
  }

  const existingCodes = new Set(
    store.users.map((u) => normalizeReferralCode(u.referralCode))
  );
  const user: User = {
    id: randomUUID(),
    email,
    name,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    balanceRub: 0,
    referralCode: generateReferralCode(existingCodes),
    referredByUserId,
    promoCodeUsed,
  };
  store.users.push(user);
  store.settings = settings;
  saveStore(store);

  const bonusRub = settings.newUserBonusRub;
  if (bonusRub > 0) {
    creditUserBalance({
      userId: user.id,
      amountRub: bonusRub,
      description: `Бонус за регистрацию ${bonusRub} ₽`,
      yooPaymentId: `signup-bonus-${user.id}`,
    });
  }

  const publicUser = getUserById(user.id);
  return {
    ok: true,
    user:
      publicUser ??
      toPublicUser({
        ...user,
        balanceRub: bonusRub,
      }),
  };
}

export function loginUser(input: {
  email: string;
  password: string;
}): { ok: true; user: PublicUser } | { ok: false; error: string } {
  const email = normalizeEmail(input.email);
  const store = ensureStore();
  const user = store.users.find((u) => u.email === email);
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    return { ok: false, error: "Неверный email или пароль" };
  }
  return {
    ok: true,
    user: toPublicUser(user),
  };
}

export function getUserById(id: string): PublicUser | null {
  const user = ensureStore().users.find((u) => u.id === id);
  if (!user) return null;
  return toPublicUser(user);
}

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  balanceRub: number;
  referralCode: string;
  referredByUserId?: string;
};

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    balanceRub: Math.round((user.balanceRub || 0) * 100) / 100,
    referralCode: user.referralCode,
    referredByUserId: user.referredByUserId,
  };
}

export function getUserBalance(userId: string): number {
  const user = ensureStore().users.find((u) => u.id === userId);
  return user?.balanceRub ?? 0;
}

export function listLedgerForUser(userId: string, limit = 20): LedgerEntry[] {
  return ensureStore()
    .ledger.filter((e) => e.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getSettings(): StoreSettings {
  const store = ensureStore();
  const settings = mergeSettings(store.settings);
  if (!store.settings) {
    store.settings = settings;
    saveStore(store);
  }
  return settings;
}

export function updateSettings(
  patch: Partial<StoreSettings>
): StoreSettings {
  const store = ensureStore();
  store.settings = mergeSettings({ ...mergeSettings(store.settings), ...patch });
  saveStore(store);
  return store.settings;
}

export function findUserByReferralCode(code: string): User | null {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  return (
    ensureStore().users.find(
      (u) => normalizeReferralCode(u.referralCode) === normalized
    ) ?? null
  );
}

export function listUsersAdmin(): {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  balanceRub: number;
  referralCode: string;
  referredByUserId?: string;
  referredByEmail?: string;
  invitedCount: number;
  referralEarnedRub: number;
}[] {
  const store = ensureStore();
  const byId = new Map(store.users.map((u) => [u.id, u]));
  return store.users
    .map((u) => {
      const invitedCount = store.users.filter(
        (x) => x.referredByUserId === u.id
      ).length;
      const referralEarnedRub = store.ledger
        .filter(
          (e) =>
            e.userId === u.id &&
            e.type === "adjust" &&
            typeof e.yooPaymentId === "string" &&
            e.yooPaymentId.startsWith("ref-")
        )
        .reduce((sum, e) => sum + Math.max(0, e.amountRub), 0);
      const referrer = u.referredByUserId
        ? byId.get(u.referredByUserId)
        : undefined;
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt,
        balanceRub: u.balanceRub,
        referralCode: u.referralCode,
        referredByUserId: u.referredByUserId,
        referredByEmail: referrer?.email,
        invitedCount,
        referralEarnedRub: Math.round(referralEarnedRub * 100) / 100,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listLedgerAdmin(limit = 50): (LedgerEntry & {
  userEmail?: string;
  userName?: string;
})[] {
  const store = ensureStore();
  const byId = new Map(store.users.map((u) => [u.id, u]));
  return store.ledger
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((e) => {
      const u = byId.get(e.userId);
      return {
        ...e,
        userEmail: u?.email,
        userName: u?.name,
      };
    });
}

export function getReferralOverview(): {
  pairs: {
    referrerId: string;
    referrerEmail: string;
    referrerName: string;
    inviteeId: string;
    inviteeEmail: string;
    inviteeName: string;
    inviteeCreatedAt: string;
    earnedFromInviteeRub: number;
  }[];
  totalReferralPaidRub: number;
  recentPayouts: LedgerEntry[];
} {
  const store = ensureStore();
  const byId = new Map(store.users.map((u) => [u.id, u]));
  const pairs = store.users
    .filter((u) => u.referredByUserId)
    .map((invitee) => {
      const referrer = byId.get(invitee.referredByUserId!);
      const earnedFromInviteeRub = store.ledger
        .filter(
          (e) =>
            e.userId === invitee.referredByUserId &&
            e.type === "adjust" &&
            typeof e.yooPaymentId === "string" &&
            e.yooPaymentId.startsWith(`ref-`) &&
            e.description.includes(invitee.email)
        )
        .reduce((sum, e) => sum + Math.max(0, e.amountRub), 0);
      // Fallback: match by payment chain is hard; sum all ref payouts for referrer from this invitee's topups via description containing invitee name/email
      return {
        referrerId: invitee.referredByUserId!,
        referrerEmail: referrer?.email || "",
        referrerName: referrer?.name || "",
        inviteeId: invitee.id,
        inviteeEmail: invitee.email,
        inviteeName: invitee.name,
        inviteeCreatedAt: invitee.createdAt,
        earnedFromInviteeRub: Math.round(earnedFromInviteeRub * 100) / 100,
      };
    })
    .sort((a, b) => b.inviteeCreatedAt.localeCompare(a.inviteeCreatedAt));

  const recentPayouts = store.ledger
    .filter(
      (e) =>
        e.type === "adjust" &&
        typeof e.yooPaymentId === "string" &&
        e.yooPaymentId.startsWith("ref-")
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);

  const totalReferralPaidRub =
    Math.round(
      recentPayouts.reduce((s, e) => s + Math.max(0, e.amountRub), 0) * 100
    ) / 100;

  // Better total: all ref payouts not just recent
  const allRef = store.ledger.filter(
    (e) =>
      e.type === "adjust" &&
      typeof e.yooPaymentId === "string" &&
      e.yooPaymentId.startsWith("ref-")
  );
  const totalAll =
    Math.round(allRef.reduce((s, e) => s + Math.max(0, e.amountRub), 0) * 100) /
    100;

  return {
    pairs,
    totalReferralPaidRub: totalAll,
    recentPayouts,
  };
}

export function getMyReferralStats(userId: string): {
  referralCode: string;
  referralPercent: number;
  invitedCount: number;
  earnedRub: number;
  invitees: { id: string; name: string; email: string; createdAt: string }[];
} {
  const store = ensureStore();
  const user = store.users.find((u) => u.id === userId);
  const settings = mergeSettings(store.settings);
  const invitees = store.users
    .filter((u) => u.referredByUserId === userId)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const earnedRub =
    Math.round(
      store.ledger
        .filter(
          (e) =>
            e.userId === userId &&
            e.type === "adjust" &&
            typeof e.yooPaymentId === "string" &&
            e.yooPaymentId.startsWith("ref-")
        )
        .reduce((sum, e) => sum + Math.max(0, e.amountRub), 0) * 100
    ) / 100;

  return {
    referralCode: user?.referralCode || "",
    referralPercent: settings.referralPercent,
    invitedCount: invitees.length,
    earnedRub,
    invitees,
  };
}

/** Начислить рефереру % с успешного пополнения приглашённого. */
export function payReferrerOnTopup(input: {
  payerUserId: string;
  amountRub: number;
  paymentId: string;
}):
  | { ok: true; paidRub: number; referrerId?: string }
  | { ok: false; error: string } {
  const paymentId = input.paymentId?.trim();
  const amountRub = Math.round(input.amountRub);
  if (!paymentId || amountRub <= 0) {
    return { ok: false, error: "bad amount" };
  }
  if (
    paymentId.startsWith("signup-bonus-") ||
    paymentId.startsWith("ref-")
  ) {
    return { ok: true, paidRub: 0 };
  }

  const store = ensureStore();
  const payer = store.users.find((u) => u.id === input.payerUserId);
  if (!payer?.referredByUserId) {
    return { ok: true, paidRub: 0 };
  }
  if (payer.referredByUserId === payer.id) {
    return { ok: true, paidRub: 0 };
  }

  const settings = mergeSettings(store.settings);
  const percent = settings.referralPercent;
  if (percent <= 0) {
    return { ok: true, paidRub: 0 };
  }

  const paidRub = Math.round((amountRub * percent) / 100);
  if (paidRub <= 0) {
    return { ok: true, paidRub: 0 };
  }

  const refPaymentId = `ref-${paymentId}`;
  const already = store.ledger.find(
    (e) => e.yooPaymentId === refPaymentId && e.type === "adjust"
  );
  if (already) {
    return {
      ok: true,
      paidRub: already.amountRub,
      referrerId: payer.referredByUserId,
    };
  }

  const result = creditOrDebit({
    userId: payer.referredByUserId,
    amountRub: paidRub,
    type: "adjust",
    description: `Реферальное вознаграждение ${percent}% с пополнения ${payer.email} (${amountRub} ₽)`,
    yooPaymentId: refPaymentId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return {
    ok: true,
    paidRub,
    referrerId: payer.referredByUserId,
  };
}

export function adminAdjustBalance(input: {
  userId: string;
  amountRub: number;
  description?: string;
}):
  | { ok: true; balanceRub: number; entry: LedgerEntry }
  | { ok: false; error: string; balanceRub: number } {
  const amountRub = Math.round(input.amountRub * 100) / 100;
  if (!amountRub) {
    return {
      ok: false,
      error: "Сумма не должна быть 0",
      balanceRub: getUserBalance(input.userId),
    };
  }
  return creditOrDebit({
    userId: input.userId,
    amountRub,
    type: "adjust",
    description:
      input.description?.trim() ||
      (amountRub > 0
        ? `Корректировка админом +${amountRub} ₽`
        : `Корректировка админом ${amountRub} ₽`),
    yooPaymentId: `admin-adjust-${randomUUID()}`,
  });
}

export function getAdminDashboardStats(): {
  usersCount: number;
  balanceSumRub: number;
  topupMonthRub: number;
  chargeMonthRub: number;
  referralPaidMonthRub: number;
} {
  const store = ensureStore();
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let topupMonthRub = 0;
  let chargeMonthRub = 0;
  let referralPaidMonthRub = 0;
  for (const e of store.ledger) {
    if (!e.createdAt.startsWith(monthPrefix)) continue;
    if (e.type === "topup" && e.amountRub > 0) topupMonthRub += e.amountRub;
    if (e.type === "charge" && e.amountRub < 0)
      chargeMonthRub += Math.abs(e.amountRub);
    if (
      e.type === "adjust" &&
      e.yooPaymentId?.startsWith("ref-") &&
      e.amountRub > 0
    ) {
      referralPaidMonthRub += e.amountRub;
    }
  }
  return {
    usersCount: store.users.length,
    balanceSumRub:
      Math.round(
        store.users.reduce((s, u) => s + (u.balanceRub || 0), 0) * 100
      ) / 100,
    topupMonthRub: Math.round(topupMonthRub * 100) / 100,
    chargeMonthRub: Math.round(chargeMonthRub * 100) / 100,
    referralPaidMonthRub: Math.round(referralPaidMonthRub * 100) / 100,
  };
}

function creditOrDebit(input: {
  userId: string;
  amountRub: number;
  type: LedgerEntry["type"];
  description: string;
  yooPaymentId?: string;
  projectId?: string;
}):
  | { ok: true; balanceRub: number; entry: LedgerEntry }
  | { ok: false; error: string; balanceRub: number } {
  const store = ensureStore();
  const idx = store.users.findIndex((u) => u.id === input.userId);
  if (idx === -1) {
    return { ok: false, error: "Пользователь не найден", balanceRub: 0 };
  }
  const user = store.users[idx];
  const next = Math.round((user.balanceRub + input.amountRub) * 100) / 100;
  if (next < -0.001) {
    return {
      ok: false,
      error: "Недостаточно средств на балансе",
      balanceRub: user.balanceRub,
    };
  }
  user.balanceRub = Math.max(0, next);
  const entry: LedgerEntry = {
    id: randomUUID(),
    userId: input.userId,
    type: input.type,
    amountRub: input.amountRub,
    balanceAfter: user.balanceRub,
    description: input.description,
    createdAt: new Date().toISOString(),
    yooPaymentId: input.yooPaymentId,
    projectId: input.projectId,
  };
  store.ledger.push(entry);
  store.users[idx] = user;
  saveStore(store);
  return { ok: true, balanceRub: user.balanceRub, entry };
}

/** Пополнение баланса (после успешной оплаты ЮKassa или демо). */
export function creditUserBalance(input: {
  userId: string;
  amountRub: number;
  description: string;
  yooPaymentId?: string;
}):
  | { ok: true; balanceRub: number; entry: LedgerEntry }
  | { ok: false; error: string; balanceRub: number } {
  if (input.amountRub <= 0) {
    return {
      ok: false,
      error: "Сумма пополнения должна быть больше 0",
      balanceRub: getUserBalance(input.userId),
    };
  }
  if (input.yooPaymentId) {
    const store = ensureStore();
    const already = store.ledger.find(
      (e) => e.yooPaymentId === input.yooPaymentId && e.type === "topup"
    );
    if (already) {
      return {
        ok: true,
        balanceRub: getUserBalance(input.userId),
        entry: already,
      };
    }
  }
  return creditOrDebit({
    userId: input.userId,
    amountRub: input.amountRub,
    type: "topup",
    description: input.description,
    yooPaymentId: input.yooPaymentId,
  });
}

/** Списание за работу маркетолога (N постов). */
export function chargeUserForPosts(input: {
  userId: string;
  postsCount: number;
  pricePerPost: number;
  projectId?: string;
  description?: string;
}):
  | { ok: true; balanceRub: number; chargedRub: number; entry: LedgerEntry }
  | { ok: false; error: string; balanceRub: number; needRub: number } {
  const chargedRub =
    Math.max(0, Math.floor(input.postsCount)) * input.pricePerPost;
  const balance = getUserBalance(input.userId);
  if (chargedRub <= 0) {
    return {
      ok: true,
      balanceRub: balance,
      chargedRub: 0,
      entry: {
        id: "noop",
        userId: input.userId,
        type: "charge",
        amountRub: 0,
        balanceAfter: balance,
        description: "Без списания",
        createdAt: new Date().toISOString(),
      },
    };
  }
  if (balance + 0.001 < chargedRub) {
    return {
      ok: false,
      error: `Недостаточно средств: нужно ${chargedRub} ₽, на балансе ${balance} ₽`,
      balanceRub: balance,
      needRub: chargedRub,
    };
  }
  const result = creditOrDebit({
    userId: input.userId,
    amountRub: -chargedRub,
    type: "charge",
    description:
      input.description ||
      `Маркетолог: ${input.postsCount} постов × ${input.pricePerPost} ₽`,
    projectId: input.projectId,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      balanceRub: result.balanceRub,
      needRub: chargedRub,
    };
  }
  return {
    ok: true,
    balanceRub: result.balanceRub,
    chargedRub,
    entry: result.entry,
  };
}

/** Списание фиксированной суммы за сервис (rewrite / фото и т.п.). */
export function chargeUserFixed(input: {
  userId: string;
  amountRub: number;
  description: string;
  projectId?: string;
}):
  | { ok: true; balanceRub: number; chargedRub: number; entry: LedgerEntry }
  | { ok: false; error: string; balanceRub: number; needRub: number } {
  const chargedRub = Math.max(0, Math.round(input.amountRub * 100) / 100);
  const balance = getUserBalance(input.userId);
  if (chargedRub <= 0) {
    return {
      ok: true,
      balanceRub: balance,
      chargedRub: 0,
      entry: {
        id: "noop",
        userId: input.userId,
        type: "charge",
        amountRub: 0,
        balanceAfter: balance,
        description: "Без списания",
        createdAt: new Date().toISOString(),
      },
    };
  }
  if (balance + 0.001 < chargedRub) {
    return {
      ok: false,
      error: `Недостаточно средств: нужно ${chargedRub} ₽, на балансе ${balance} ₽`,
      balanceRub: balance,
      needRub: chargedRub,
    };
  }
  const result = creditOrDebit({
    userId: input.userId,
    amountRub: -chargedRub,
    type: "charge",
    description: input.description,
    projectId: input.projectId,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      balanceRub: result.balanceRub,
      needRub: chargedRub,
    };
  }
  return {
    ok: true,
    balanceRub: result.balanceRub,
    chargedRub,
    entry: result.entry,
  };
}

export function savePendingTopUp(input: {
  userId: string;
  amountRub: number;
  yooPaymentId: string;
}): PendingTopUp {
  const store = ensureStore();
  const row: PendingTopUp = {
    id: randomUUID(),
    userId: input.userId,
    amountRub: input.amountRub,
    yooPaymentId: input.yooPaymentId,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  store.pendingTopUps.push(row);
  saveStore(store);
  return row;
}

export function markTopUpSucceeded(yooPaymentId: string): PendingTopUp | null {
  const store = ensureStore();
  const idx = store.pendingTopUps.findIndex(
    (p) => p.yooPaymentId === yooPaymentId
  );
  if (idx === -1) return null;
  store.pendingTopUps[idx] = {
    ...store.pendingTopUps[idx],
    status: "succeeded",
  };
  saveStore(store);
  return store.pendingTopUps[idx];
}

export function findPendingTopUp(
  yooPaymentId: string
): PendingTopUp | null {
  return (
    ensureStore().pendingTopUps.find((p) => p.yooPaymentId === yooPaymentId) ??
    null
  );
}

export function listProjectsForUser(userId: string): Project[] {
  return ensureStore()
    .projects.filter((p) => p.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProject(id: string): Project | null {
  return ensureStore().projects.find((p) => p.id === id) ?? null;
}

export function getProjectForUser(id: string, userId: string): Project | null {
  const project = getProject(id);
  if (!project || project.userId !== userId) return null;
  return project;
}

export function createProject(
  userId: string,
  input?: { name?: string; brief?: Partial<BrandBrief> }
): Project {
  const store = ensureStore();
  const name = input?.name?.trim() || "Мой бизнес";
  const now = new Date().toISOString();
  const brief = {
    ...defaultBrief(input?.brief?.brandName ?? (input?.name?.trim() || "")),
    ...input?.brief,
    brandName: input?.brief?.brandName || input?.name?.trim() || "",
  };

  const project: Project = {
    id: randomUUID(),
    userId,
    name,
    createdAt: now,
    updatedAt: now,
    brief,
    channels: {},
    bots: {},
    botReplies: [],
    plan: null,
    planSource: null,
    planJob: null,
    drafts: [],
    draftsSource: null,
    draftsJob: null,
  };

  store.projects.push(project);
  saveStore(store);
  return project;
}

export function updateProject(
  id: string,
  userId: string,
  patch: Partial<
    Pick<
      Project,
      | "name"
      | "brief"
      | "channels"
      | "bots"
      | "botReplies"
      | "plan"
      | "planSource"
      | "planJob"
      | "drafts"
      | "draftsSource"
      | "draftsJob"
    >
  >,
  options?: { replaceChannels?: boolean }
): Project | null {
  const store = ensureStore();
  const idx = store.projects.findIndex((p) => p.id === id && p.userId === userId);
  if (idx === -1) return null;

  const current = store.projects[idx];
  const channels = patch.channels
    ? options?.replaceChannels
      ? patch.channels
      : { ...current.channels, ...patch.channels }
    : current.channels;

  const bots = patch.bots
    ? { ...(current.bots ?? {}), ...patch.bots }
    : current.bots;

  const next = touch({
    ...current,
    ...patch,
    brief: patch.brief ? { ...current.brief, ...patch.brief } : current.brief,
    channels,
    bots,
    botReplies:
      patch.botReplies === undefined ? current.botReplies : patch.botReplies,
    planJob:
      patch.planJob === undefined
        ? current.planJob
        : patch.planJob,
    draftsJob:
      patch.draftsJob === undefined
        ? current.draftsJob
        : patch.draftsJob,
  });

  store.projects[idx] = next;
  saveStore(store);
  return next;
}

export function deleteProject(
  id: string,
  userId: string,
  options?: { confirmName?: string; permanent?: boolean }
): { ok: true } | { ok: false; error: string } {
  const store = ensureStore();
  const idx = store.projects.findIndex((p) => p.id === id && p.userId === userId);
  if (idx === -1) return { ok: false, error: "Проект не найден" };

  const project = store.projects[idx];
  const expected = project.name.trim();
  const got = (options?.confirmName ?? "").trim();
  if (!got || got !== expected) {
    return {
      ok: false,
      error: `Для удаления введите точное название: «${expected}»`,
    };
  }

  store.projects.splice(idx, 1);

  if (options?.permanent) {
    saveStore(store);
    return { ok: true };
  }

  store.trash = store.trash.filter((t) => t.id !== id);
  store.trash.unshift({
    ...project,
    deletedAt: new Date().toISOString(),
  });
  // keep last 20 trashed projects per user
  const others = store.trash.filter((t) => t.userId !== userId);
  const mine = store.trash.filter((t) => t.userId === userId).slice(0, 20);
  store.trash = [...mine, ...others];
  saveStore(store);
  return { ok: true };
}

export function listTrashForUser(userId: string): TrashedProject[] {
  return ensureStore()
    .trash.filter((t) => t.userId === userId)
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export function restoreProjectFromTrash(
  id: string,
  userId: string
): Project | null {
  const store = ensureStore();
  const idx = store.trash.findIndex((t) => t.id === id && t.userId === userId);
  if (idx === -1) return null;

  const { deletedAt: _deletedAt, ...rest } = store.trash[idx];
  const project = touch(rest as Project);
  store.trash.splice(idx, 1);

  if (store.projects.some((p) => p.id === project.id)) {
    project.id = randomUUID();
  }
  store.projects.unshift(project);
  saveStore(store);
  return project;
}

/** Восстановить проект вручную (например после аварии), если id свободен */
export function upsertRecoveredProject(project: Project): Project {
  const store = ensureStore();
  const idx = store.projects.findIndex((p) => p.id === project.id);
  const next = touch(project);
  if (idx === -1) store.projects.unshift(next);
  else store.projects[idx] = next;
  store.trash = store.trash.filter((t) => t.id !== project.id);
  saveStore(store);
  return next;
}

export function setTelegramChannel(
  projectId: string,
  userId: string,
  data: { botToken: string; chatId: string }
): Project | null {
  const project = getProjectForUser(projectId, userId);
  if (!project) return null;
  return updateProject(projectId, userId, {
    channels: {
      ...project.channels,
      telegram: {
        botToken: data.botToken.trim(),
        chatId: data.chatId.trim(),
        connectedAt: new Date().toISOString(),
      },
    },
  });
}

export function setVkChannel(
  projectId: string,
  userId: string,
  data: {
    accessToken: string;
    groupId: string;
    groupName?: string;
    vkUserId?: number;
    userAccessToken?: string;
    expiresAt?: string;
    isStub?: boolean;
  }
): Project | null {
  const project = getProjectForUser(projectId, userId);
  if (!project) return null;
  const prev = project.channels.vk;
  return updateProject(projectId, userId, {
    channels: {
      ...project.channels,
      vk: {
        accessToken: data.accessToken.trim(),
        groupId: data.groupId.trim(),
        groupName: data.groupName?.trim(),
        vkUserId: data.vkUserId,
        userAccessToken:
          data.userAccessToken?.trim() || prev?.userAccessToken,
        expiresAt: data.expiresAt,
        isStub: data.isStub,
        connectedAt: prev?.connectedAt || new Date().toISOString(),
      },
    },
  });
}

export function setVkUserAccessToken(
  projectId: string,
  userId: string,
  userAccessToken: string
): Project | null {
  const project = getProjectForUser(projectId, userId);
  if (!project?.channels.vk) return null;
  return updateProject(projectId, userId, {
    channels: {
      ...project.channels,
      vk: {
        ...project.channels.vk,
        userAccessToken: userAccessToken.trim(),
      },
    },
  });
}

export function savePendingVkOAuthFlow(input: {
  projectId: string;
  userId: string;
  codeVerifier: string;
  purpose?: "connect" | "photo";
  redirectUri?: string;
}): PendingVkOAuthFlow {
  const store = ensureStore();
  const state = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const purpose = input.purpose ?? "connect";
  const entry: PendingVkOAuthFlow = {
    state,
    projectId: input.projectId,
    userId: input.userId,
    codeVerifier: input.codeVerifier,
    redirectUri: input.redirectUri,
    purpose,
    createdAt: new Date().toISOString(),
  };
  store.pendingVkOAuth = [
    ...(store.pendingVkOAuth ?? []).filter(
      (p) =>
        !(
          p.projectId === input.projectId &&
          p.userId === input.userId &&
          (p.purpose ?? "connect") === purpose
        )
    ),
    entry,
  ];
  saveStore(store);
  return entry;
}

export function getPendingVkOAuthFlow(state: string): PendingVkOAuthFlow | null {
  const store = ensureStore();
  const entry = (store.pendingVkOAuth ?? []).find((p) => p.state === state);
  if (!entry) return null;
  const ageMs = Date.now() - new Date(entry.createdAt).getTime();
  if (ageMs > 15 * 60_000) return null;
  return entry;
}

export function clearPendingVkOAuthFlow(state: string): void {
  const store = ensureStore();
  store.pendingVkOAuth = (store.pendingVkOAuth ?? []).filter(
    (p) => p.state !== state
  );
  saveStore(store);
}

export function savePendingVkCommunityFlow(input: {
  projectId: string;
  userId: string;
  groupId: string;
}): PendingVkCommunityFlow {
  const store = ensureStore();
  const state = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const entry: PendingVkCommunityFlow = {
    state,
    projectId: input.projectId,
    userId: input.userId,
    groupId: input.groupId.replace(/^-/, "").trim(),
    createdAt: new Date().toISOString(),
  };
  store.pendingVkCommunity = [
    ...(store.pendingVkCommunity ?? []).filter(
      (p) => !(p.projectId === input.projectId && p.userId === input.userId)
    ),
    entry,
  ];
  saveStore(store);
  return entry;
}

export function getPendingVkCommunityFlow(
  state: string
): PendingVkCommunityFlow | null {
  const store = ensureStore();
  const entry = (store.pendingVkCommunity ?? []).find((p) => p.state === state);
  if (!entry) return null;
  const ageMs = Date.now() - new Date(entry.createdAt).getTime();
  if (ageMs > 15 * 60_000) return null;
  return entry;
}

export function clearPendingVkCommunityFlow(state: string): void {
  const store = ensureStore();
  store.pendingVkCommunity = (store.pendingVkCommunity ?? []).filter(
    (p) => p.state !== state
  );
  saveStore(store);
}

export function savePendingVkUserFlow(input: {
  projectId: string;
  userId: string;
  redirectUri: string;
}): PendingVkUserFlow {
  const store = ensureStore();
  const state = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const entry: PendingVkUserFlow = {
    state,
    projectId: input.projectId,
    userId: input.userId,
    redirectUri: input.redirectUri,
    createdAt: new Date().toISOString(),
  };
  store.pendingVkUser = [
    ...(store.pendingVkUser ?? []).filter(
      (p) =>
        !(
          p.projectId === input.projectId && p.userId === input.userId
        )
    ),
    entry,
  ];
  saveStore(store);
  return entry;
}

export function getPendingVkUserFlow(
  state: string
): PendingVkUserFlow | null {
  const store = ensureStore();
  const entry = (store.pendingVkUser ?? []).find((p) => p.state === state);
  if (!entry) return null;
  const ageMs = Date.now() - new Date(entry.createdAt).getTime();
  if (ageMs > 15 * 60_000) return null;
  return entry;
}

export function clearPendingVkUserFlow(state: string): void {
  const store = ensureStore();
  store.pendingVkUser = (store.pendingVkUser ?? []).filter(
    (p) => p.state !== state
  );
  saveStore(store);
}

export function savePendingVkAuth(
  data: Omit<PendingVkAuth, "createdAt">
): PendingVkAuth {
  const store = ensureStore();
  const entry: PendingVkAuth = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  store.pendingVkAuth = [
    ...(store.pendingVkAuth ?? []).filter(
      (p) => !(p.projectId === data.projectId && p.userId === data.userId)
    ),
    entry,
  ];
  saveStore(store);
  return entry;
}

export function getPendingVkAuth(
  projectId: string,
  userId: string
): PendingVkAuth | null {
  const store = ensureStore();
  const entry = (store.pendingVkAuth ?? []).find(
    (p) => p.projectId === projectId && p.userId === userId
  );
  if (!entry) return null;
  const ageMs = Date.now() - new Date(entry.createdAt).getTime();
  if (ageMs > 30 * 60_000) return null;
  return entry;
}

export function clearPendingVkAuth(projectId: string, userId: string): void {
  const store = ensureStore();
  store.pendingVkAuth = (store.pendingVkAuth ?? []).filter(
    (p) => !(p.projectId === projectId && p.userId === userId)
  );
  saveStore(store);
}

export function setFacebookChannel(
  projectId: string,
  userId: string,
  data: Omit<FacebookConnection, "connectedAt">
): Project | null {
  const project = getProjectForUser(projectId, userId);
  if (!project) return null;
  return updateProject(projectId, userId, {
    channels: {
      ...project.channels,
      facebook: { ...data, connectedAt: new Date().toISOString() },
    },
  });
}

export function setInstagramChannel(
  projectId: string,
  userId: string,
  data: Omit<InstagramConnection, "connectedAt">
): Project | null {
  const project = getProjectForUser(projectId, userId);
  if (!project) return null;
  return updateProject(projectId, userId, {
    channels: {
      ...project.channels,
      instagram: { ...data, connectedAt: new Date().toISOString() },
    },
  });
}

export function setThreadsChannel(
  projectId: string,
  userId: string,
  data: Omit<ThreadsConnection, "connectedAt">
): Project | null {
  const project = getProjectForUser(projectId, userId);
  if (!project) return null;
  return updateProject(projectId, userId, {
    channels: {
      ...project.channels,
      threads: { ...data, connectedAt: new Date().toISOString() },
    },
  });
}

/** Подключить Facebook / Instagram / Threads без реального Meta (для тестов UI). */
export function setMetaStubChannel(
  projectId: string,
  userId: string,
  channel: "facebook" | "instagram" | "threads"
): Project | null {
  const project = getProjectForUser(projectId, userId);
  if (!project) return null;
  if (channel === "facebook") {
    return setFacebookChannel(projectId, userId, {
      userAccessToken: "stub",
      pageId: "stub-page",
      pageName: "Demo Page (заглушка)",
      pageAccessToken: "stub",
      isStub: true,
    });
  }
  if (channel === "instagram") {
    return setInstagramChannel(projectId, userId, {
      userAccessToken: "stub",
      pageId: "stub-page",
      pageName: "Demo Page (заглушка)",
      pageAccessToken: "stub",
      igUserId: "stub-ig",
      isStub: true,
    });
  }
  return setThreadsChannel(projectId, userId, {
    accessToken: "stub",
    threadsUserId: "stub-threads",
    username: "demo_threads",
    isStub: true,
  });
}

export function setXChannel(
  projectId: string,
  userId: string,
  data: Omit<XConnection, "connectedAt">
): Project | null {
  const project = getProjectForUser(projectId, userId);
  if (!project) return null;
  return updateProject(projectId, userId, {
    channels: {
      ...project.channels,
      x: { ...data, connectedAt: new Date().toISOString() },
    },
  });
}

export function removeChannel(
  projectId: string,
  userId: string,
  channel: Extract<
    Channel,
    "telegram" | "vk" | "facebook" | "instagram" | "threads" | "x"
  >
): Project | null {
  const project = getProjectForUser(projectId, userId);
  if (!project) return null;
  const channels = { ...project.channels };
  delete channels[channel];
  return updateProject(projectId, userId, { channels }, { replaceChannels: true });
}

function addDaysIso(days: number, from = new Date()): string {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function getCommentBot(
  project: Project,
  channel: BotChannel
): CommentBot {
  return project.bots?.[channel] ?? defaultCommentBot();
}

export function setCommentBot(
  projectId: string,
  userId: string,
  channel: BotChannel,
  bot: CommentBot
): Project | null {
  return updateProject(projectId, userId, {
    bots: { [channel]: bot },
  });
}

export function extendBotPaidUntil(
  currentPaidUntil: string | null | undefined,
  days: number
): string {
  const base =
    currentPaidUntil && Date.parse(currentPaidUntil) > Date.now()
      ? new Date(currentPaidUntil)
      : new Date();
  return addDaysIso(days, base);
}

export function appendBotReplyLog(
  projectId: string,
  entry: Omit<BotReplyLog, "id" | "createdAt">
): Project | null {
  const store = ensureStore();
  const idx = store.projects.findIndex((p) => p.id === projectId);
  if (idx === -1) return null;
  const project = store.projects[idx];
  const log: BotReplyLog = {
    ...entry,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const botReplies = [log, ...(project.botReplies ?? [])].slice(0, 50);
  const next = touch({ ...project, botReplies });
  store.projects[idx] = next;
  saveStore(store);
  return next;
}

/** Обновить диагностику webhook без userId (callback от VK/TG). */
export function touchBotWebhook(
  projectId: string,
  channel: BotChannel,
  info: { type?: string; note?: string }
): Project | null {
  const store = ensureStore();
  const idx = store.projects.findIndex((p) => p.id === projectId);
  if (idx === -1) return null;
  const project = store.projects[idx];
  const current = project.bots?.[channel] ?? defaultCommentBot();
  const bots: ProjectBots = {
    ...(project.bots ?? {}),
    [channel]: {
      ...current,
      lastWebhookAt: new Date().toISOString(),
      lastWebhookType: info.type,
      lastWebhookNote: info.note,
    },
  };
  const next = touch({ ...project, bots });
  store.projects[idx] = next;
  saveStore(store);
  return next;
}

export function findProjectByVkGroupId(groupId: string): Project | null {
  const gid = String(groupId).replace(/^-/, "");
  const store = ensureStore();
  return (
    store.projects.find((p) => {
      const g = p.channels.vk?.groupId?.replace(/^-/, "");
      return g && g === gid;
    }) ?? null
  );
}

export function findProjectByTelegramWebhookSecret(
  secret: string
): Project | null {
  if (!secret) return null;
  const store = ensureStore();
  return (
    store.projects.find((p) => p.bots?.telegram?.webhookSecret === secret) ??
    null
  );
}

export function findProjectByTelegramBotToken(token: string): Project | null {
  if (!token) return null;
  const store = ensureStore();
  return (
    store.projects.find((p) => p.channels.telegram?.botToken === token) ?? null
  );
}

export function newBotSecrets(): {
  vkConfirmation: string;
  vkSecret: string;
  webhookSecret: string;
} {
  return {
    vkConfirmation: randomBytes(6).toString("hex"),
    vkSecret: randomBytes(16).toString("hex"),
    webhookSecret: randomBytes(24).toString("hex"),
  };
}

export function toPublicProject(project: Project) {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    brief: project.brief,
    plan: project.plan,
    planSource: project.planSource,
    planJob: project.planJob ?? null,
    drafts: project.drafts,
    draftsSource: project.draftsSource,
    draftsJob: project.draftsJob ?? null,
    bots: {
      vk: toPublicCommentBot(project.bots?.vk),
      telegram: toPublicCommentBot(project.bots?.telegram),
    },
    botReplies: (project.botReplies ?? []).slice(0, 30).map((r) => ({
      id: r.id,
      channel: r.channel,
      mode: r.mode,
      commentPreview: r.commentPreview,
      replyPreview: r.replyPreview,
      chargedRub: r.chargedRub,
      createdAt: r.createdAt,
      ok: r.ok,
      error: r.error,
    })),
    channels: {
      telegram: project.channels.telegram
        ? {
            connected: true,
            chatId: project.channels.telegram.chatId,
            connectedAt: project.channels.telegram.connectedAt,
            botTokenMasked: maskSecret(project.channels.telegram.botToken),
          }
        : { connected: false },
      vk: project.channels.vk
        ? {
            connected: true,
            groupId: project.channels.vk.groupId,
            groupName: project.channels.vk.groupName,
            connectedAt: project.channels.vk.connectedAt,
            isStub: Boolean(project.channels.vk.isStub),
            accessTokenMasked: maskSecret(project.channels.vk.accessToken),
            hasUserPhotoToken: Boolean(project.channels.vk.userAccessToken),
          }
        : { connected: false },
      facebook: project.channels.facebook
        ? {
            connected: true,
            pageId: project.channels.facebook.pageId,
            pageName: project.channels.facebook.pageName,
            connectedAt: project.channels.facebook.connectedAt,
            isStub: Boolean(project.channels.facebook.isStub),
          }
        : { connected: false },
      instagram: project.channels.instagram
        ? {
            connected: true,
            igUserId: project.channels.instagram.igUserId,
            pageName: project.channels.instagram.pageName,
            connectedAt: project.channels.instagram.connectedAt,
            isStub: Boolean(project.channels.instagram.isStub),
          }
        : { connected: false },
      threads: project.channels.threads
        ? {
            connected: true,
            threadsUserId: project.channels.threads.threadsUserId,
            username: project.channels.threads.username,
            connectedAt: project.channels.threads.connectedAt,
            isStub: Boolean(project.channels.threads.isStub),
          }
        : { connected: false },
      x: project.channels.x
        ? {
            connected: true,
            userId: project.channels.x.userId,
            username: project.channels.x.username,
            name: project.channels.x.name,
            connectedAt: project.channels.x.connectedAt,
          }
        : { connected: false },
    },
  };
}

function maskSecret(value: string): string {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

/** @deprecated use listProjectsForUser */
export function listProjects(): Project[] {
  return ensureStore().projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
