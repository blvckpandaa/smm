export type Channel =
  | "telegram"
  | "vk"
  | "instagram"
  | "threads"
  | "facebook"
  | "x";

export type PostGoal =
  | "awareness"
  | "trust"
  | "engagement"
  | "offer"
  | "education"
  | "community";

export type RubricId =
  | "brand_atmosphere"
  | "game_spotlight"
  | "promo_factual"
  | "education"
  | "community_hook"
  | "social_proof"
  | "responsible_play"
  | "behind_scenes"
  | "trend_react"
  | "faq_support";

export interface AudienceBrief {
  who: string;
  pain: string;
  desire: string;
}

export interface BrandBrief {
  brandName: string;
  niche: string;
  geo: string;
  language: string;
  timezone: string;
  audience: AudienceBrief;
  toneOfVoice: string[];
  offer: string;
  ctaOptions: string[];
  facts: Record<string, string>;
  channels: Channel[];
  postsPerWeek: number;
  goals?: PostGoal[];
  taboos?: string[];
  startDate: string; // YYYY-MM-DD
}

export interface PlannedPost {
  id: string;
  day: string; // YYYY-MM-DD
  weekday: string;
  timeLocal: string; // HH:mm
  scheduledAtIso: string;
  channel: Channel;
  rubric: RubricId;
  goal: PostGoal;
  topic: string;
  angle: string;
  hook: string;
  cta: string;
  whyThisTime: string;
  whyInteresting: string;
  format: "text" | "text_image" | "poll" | "carousel" | "short_video";
  mustInclude: string[];
  mustAvoid: string[];
}

export interface ContentPlan {
  brandName: string;
  niche: string;
  timezone: string;
  period: { from: string; to: string };
  summary: {
    totalPosts: number;
    byChannel: Record<string, number>;
    byGoal: Record<string, number>;
    byRubric: Record<string, number>;
  };
  strategyNotes: string[];
  postingRules: string[];
  posts: PlannedPost[];
}
