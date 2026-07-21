import type { Channel, PostGoal, RubricId } from "@/lib/marketer/types";
import { CHANNEL_WINDOWS, formatHm } from "@/lib/marketer/posting-times";
import {
  pickIdealSlot,
  weekHoursFromTaken,
} from "@/lib/marketer/pick-slot";
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

/** Подбирает лучшее локальное время для канала в указанный день. */
export function pickBestSlot(options: {
  channel: Channel;
  day: string;
  timeZone: string;
  takenHours?: Set<string>;
  goal?: PostGoal;
  rubric?: RubricId;
  format?: "text" | "text_image" | "poll" | "carousel" | "short_video";
  postIndex?: number;
}): PickedSlot {
  const { channel, day, timeZone } = options;
  const takenOnDay = new Set(options.takenHours ?? []);
  const takenWeekHours = weekHoursFromTaken(takenOnDay);

  const slot = pickIdealSlot({
    channel,
    ymd: day,
    goal: options.goal ?? "awareness",
    rubric: options.rubric ?? "education",
    format: options.format ?? "text_image",
    postIndex: options.postIndex ?? 0,
    takenOnDay,
    takenWeekHours,
  });

  const timeLocal = formatHm(slot.hour, slot.minute);
  const when = fromZonedTime(day, slot.hour, slot.minute, timeZone);

  return {
    day,
    timeLocal,
    scheduledAtIso: when.toISOString(),
    weekday: WEEKDAYS_RU[weekdayIndexFromYmd(day)],
    why: `${slot.why} · ${timeLocal} ${timeZone}`,
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
