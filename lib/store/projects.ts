import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BrandBrief, Channel, ContentPlan } from "@/lib/marketer/types";
import type { PostDraft } from "@/lib/smm/types";
import { hashPassword, verifyPassword } from "@/lib/auth/session";

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

export type Project = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  brief: BrandBrief;
  channels: ProjectChannels;
  plan: ContentPlan | null;
  planSource: "deepseek" | "local" | null;
  drafts: PostDraft[];
  draftsSource: "deepseek" | "local" | null;
};

export type TrashedProject = Project & {
  deletedAt: string;
};

type StoreFile = {
  version: 4;
  users: User[];
  projects: Project[];
  trash: TrashedProject[];
  ledger: LedgerEntry[];
  pendingTopUps: PendingTopUp[];
  pendingVkAuth?: PendingVkAuth[];
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

function emptyStore(): StoreFile {
  return {
    version: 4,
    users: [],
    projects: [],
    trash: [],
    ledger: [],
    pendingTopUps: [],
    pendingVkAuth: [],
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
      pendingVkAuth?: PendingVkAuth[];
    };
    if (!parsed.users) parsed.users = [];
    if (!parsed.projects) parsed.projects = [];
    if (!parsed.trash) parsed.trash = [];
    if (!parsed.ledger) parsed.ledger = [];
    if (!parsed.pendingTopUps) parsed.pendingTopUps = [];
    if (!parsed.pendingVkAuth) parsed.pendingVkAuth = [];
    parsed.projects = parsed.projects.map((p) => ({
      ...p,
      userId: (p as Project).userId || "",
    }));
    parsed.users = parsed.users.map((u) => ({
      ...u,
      balanceRub:
        typeof (u as User).balanceRub === "number" ? (u as User).balanceRub : 0,
    }));
    parsed.version = 4;
    return parsed as StoreFile;
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

  const user: User = {
    id: randomUUID(),
    email,
    name,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    balanceRub: 0,
  };
  store.users.push(user);
  saveStore(store);

  return {
    ok: true,
    user: toPublicUser(user),
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
};

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    balanceRub: Math.round((user.balanceRub || 0) * 100) / 100,
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
    plan: null,
    planSource: null,
    drafts: [],
    draftsSource: null,
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
      | "plan"
      | "planSource"
      | "drafts"
      | "draftsSource"
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

  const next = touch({
    ...current,
    ...patch,
    brief: patch.brief ? { ...current.brief, ...patch.brief } : current.brief,
    channels,
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
    expiresAt?: string;
    isStub?: boolean;
  }
): Project | null {
  const project = getProjectForUser(projectId, userId);
  if (!project) return null;
  return updateProject(projectId, userId, {
    channels: {
      ...project.channels,
      vk: {
        accessToken: data.accessToken.trim(),
        groupId: data.groupId.trim(),
        groupName: data.groupName?.trim(),
        vkUserId: data.vkUserId,
        expiresAt: data.expiresAt,
        isStub: data.isStub,
        connectedAt: new Date().toISOString(),
      },
    },
  });
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

export function toPublicProject(project: Project) {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    brief: project.brief,
    plan: project.plan,
    planSource: project.planSource,
    drafts: project.drafts,
    draftsSource: project.draftsSource,
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
