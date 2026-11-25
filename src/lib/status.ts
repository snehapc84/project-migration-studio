export type AvailabilityStatus = "available" | "busy" | "absent";

export const STATUS_META: Record<
  AvailabilityStatus,
  { label: string; description: string }
> = {
  available: { label: "Available", description: "Free to meet students" },
  busy: { label: "Busy", description: "Currently occupied" },
  absent: { label: "Absent", description: "Not present today" },
};

export function isStatusExpired(until: string | null | undefined, now: Date): boolean {
  if (!until) return false;
  return new Date(until).getTime() <= now.getTime();
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatRelative(iso: string, now: Date): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/**
 * Turn a "HH:MM" picked today into an ISO timestamp.
 * Returns null when the time is not later than `now`.
 */
export function untilFromTime(time: string, now: Date): string | null {
  const [h = NaN, m = NaN] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= now.getTime()) return null;
  return d.toISOString();
}
