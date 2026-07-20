import type { Channel } from "@/lib/marketer/types";
import {
  CHANNEL_WINDOWS,
  WEEKDAY_MULTIPLIER,
  formatHm,
  pickMinute,
} from "@/lib/marketer/posting-times";
import {
  fromZonedTime,
  weekdayIndexFromYmd,
} from "@/lib/marketer/timezone";

const WEEKDAYS_RU = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

export type PickedSlot = {
  day: string;
  timeLocal: string;
  scheduledAtIso: string;
  weekday: string;
  why: string;
};

/** Подбирает лучшее локальное время для канала в указанный день (или ближайший свободный час). */
export function pickBestSlot(options: {
  channel: Channel;
  day: string;
  timeZone: string;
  takenHours?: Set<string>;
  preferEvening?: boolean;
}): PickedSlot {
  const { channel, day, timeZone } = options;
  const taken = options.takenHours ?? new Set<string>();
  const dow = weekdayIndexFromYmd(day);
  const windows = CHANNEL_WINDOWS[channel] ?? CHANNEL_WINDOWS.telegram;

  let best: { hour: number; minute: number; why: string; score: number } | null =
    null;

  for (const w of windows) {
    for (let hour = w.start; hour < w.end; hour++) {
      const key = `${channel}:${day}:${hour}`;
      if (taken.has(key)) continue;
      const minute = pickMinute(channel, hour);
      let score = w.score * (WEEKDAY_MULTIPLIER[dow] ?? 1);
      if (options.preferEvening && hour >= 18) score *= 1.12;
      if (!best || score > best.score) {
        best = { hour, minute, why: w.label, score };
      }
    }
  }

  if (!best) {
    best = {
      hour: 19,
      minute: pickMinute(channel, 19),
      why: "вечерний слот по умолчанию",
      score: 50,
    };
  }

  const timeLocal = formatHm(best.hour, best.minute);
  const when = fromZonedTime(day, best.hour, best.minute, timeZone);

  return {
    day,
    timeLocal,
    scheduledAtIso: when.toISOString(),
    weekday: WEEKDAYS_RU[dow],
    why: `${best.why} · ${timeLocal} ${timeZone}`,
  };
}

/** Пересчитать ISO из даты+времени в таймзоне проекта */
export function slotFromLocalInput(options: {
  day: string;
  timeLocal: string;
  timeZone: string;
  channel: Channel;
}): PickedSlot {
  const [h, m] = options.timeLocal.split(":").map(Number);
  const hour = Number.isFinite(h) ? h : 19;
  const minute = Number.isFinite(m) ? m : 0;
  const when = fromZonedTime(options.day, hour, minute, options.timeZone);
  const dow = weekdayIndexFromYmd(options.day);
  const windows = CHANNEL_WINDOWS[options.channel] ?? [];
  const match = windows.find((w) => hour >= w.start && hour < w.end);

  return {
    day: options.day,
    timeLocal: formatHm(hour, minute),
    scheduledAtIso: when.toISOString(),
    weekday: WEEKDAYS_RU[dow],
    why: match
      ? `${match.label} · ${formatHm(hour, minute)} ${options.timeZone}`
      : `вручную · ${formatHm(hour, minute)} ${options.timeZone}`,
  };
}
