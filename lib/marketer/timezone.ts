/** Convert local wall time in `timeZone` to a UTC Date. */
export function fromZonedTime(
  ymd: string,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${ymd}`);

  let utcMs = Date.UTC(y, m - 1, d, hour, minute, 0);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let i = 0; i < 6; i++) {
    const parts = Object.fromEntries(
      dtf
        .formatToParts(new Date(utcMs))
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, p.value])
    );

    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second || "0")
    );
    const desired = Date.UTC(y, m - 1, d, hour, minute, 0);
    const diff = desired - asUtc;
    if (diff === 0) break;
    utcMs += diff;
  }

  return new Date(utcMs);
}

/** Format a Date in a timezone as YYYY-MM-DD and HH:mm */
export function formatInTimeZone(
  date: Date,
  timeZone: string
): { ymd: string; hm: string; weekday: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    dtf
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  );

  const ymd = `${parts.year}-${parts.month}-${parts.day}`;
  const hm = `${parts.hour}:${parts.minute}`;

  // weekday index from calendar YMD (civil date)
  const [yy, mm, dd] = ymd.split("-").map(Number);
  const weekday = new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay();

  return { ymd, hm, weekday };
}

/** Add calendar days to YYYY-MM-DD */
export function addCalendarDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function weekdayIndexFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
