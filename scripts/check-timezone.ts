import { createWeeklyPlan } from "@/lib/marketer/planner";
import { formatInTimeZone, fromZonedTime } from "@/lib/marketer/timezone";
import type { BrandBrief } from "@/lib/marketer/types";

const brief: BrandBrief = {
  brandName: "Test Cafe",
  niche: "кофейня",
  geo: "Москва",
  language: "ru",
  timezone: "Europe/Moscow",
  audience: { who: "офис", pain: "x", desire: "y" },
  toneOfVoice: ["тёплый"],
  offer: "кофе",
  ctaOptions: ["Приходите", "Напишите в комментарии"],
  facts: {},
  channels: ["telegram", "vk"],
  postsPerWeek: 6,
  startDate: "2026-07-16",
};

const plan = createWeeklyPlan(brief);
console.log("TZ", plan.timezone);
console.log("period", plan.period);
for (const p of plan.posts) {
  const check = formatInTimeZone(new Date(p.scheduledAtIso), plan.timezone);
  const match =
    check.ymd === p.day && check.hm === p.timeLocal ? "OK" : "MISMATCH";
  console.log(
    `${p.day} ${p.timeLocal} ${p.channel} → ${p.scheduledAtIso} | back=${check.ymd} ${check.hm} ${match}`
  );
}

const sample = fromZonedTime("2026-07-16", 19, 12, "Europe/Moscow");
const back = formatInTimeZone(sample, "Europe/Moscow");
console.log("sample 19:12 MSK", sample.toISOString(), back);
