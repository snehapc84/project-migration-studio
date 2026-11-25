export const DAYS = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
  { value: 7, short: "Sun", label: "Sunday" },
] as const;

export type TimetableEntry = {
  id: string;
  lecturer_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  room: string;
};

/** ISO weekday: Monday = 1 … Sunday = 7 */
export function isoWeekday(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

/** "HH:MM[:SS]" → minutes since midnight */
export function toMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function formatTime(time: string): string {
  const mins = toMinutes(time);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

export function sortEntries<T extends Pick<TimetableEntry, "day_of_week" | "start_time">>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) => a.day_of_week - b.day_of_week || toMinutes(a.start_time) - toMinutes(b.start_time),
  );
}

/** Entry happening at `now`, if any. */
export function currentClass<T extends TimetableEntry>(entries: T[], now: Date): T | undefined {
  const day = isoWeekday(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  return entries.find(
    (e) => e.day_of_week === day && toMinutes(e.start_time) <= mins && mins < toMinutes(e.end_time),
  );
}

/** Days to show: Mon–Sat always, Sunday only when it has classes. */
export function visibleDays(entries: Pick<TimetableEntry, "day_of_week">[]) {
  const hasSunday = entries.some((e) => e.day_of_week === 7);
  return DAYS.filter((d) => d.value !== 7 || hasSunday);
}
