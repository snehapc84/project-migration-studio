import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { STATUS_META, formatClock, isStatusExpired, type AvailabilityStatus } from "@/lib/status";

const badge = cva("inline-flex items-center gap-2 rounded-full border font-semibold uppercase tracking-wide", {
  variants: {
    status: {
      available: "bg-available-soft text-available-foreground border-available/30",
      busy: "bg-busy-soft text-busy-foreground border-busy/40",
      absent: "bg-absent-soft text-absent-foreground border-absent/30",
    },
    size: {
      sm: "px-2.5 py-0.5 text-[11px]",
      md: "px-3 py-1 text-xs",
      lg: "px-4 py-1.5 text-sm",
    },
  },
  defaultVariants: { size: "md" },
});

const dot = cva("inline-block size-2 rounded-full", {
  variants: {
    status: {
      available: "bg-available text-available animate-pulse-dot",
      busy: "bg-busy text-busy",
      absent: "bg-absent text-absent",
    },
  },
});

export function StatusBadge({
  status,
  size,
  className,
}: {
  status: AvailabilityStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn(badge({ status, size }), className)}>
      <span className={dot({ status })} aria-hidden="true" />
      {STATUS_META[status].label}
    </span>
  );
}

/** "until 12:30 PM" or "ended 12:30 PM" line under a status. */
export function StatusUntil({ until, now }: { until: string | null; now: Date }) {
  if (!until) return null;
  const expired = isStatusExpired(until, now);
  return (
    <span className={cn("text-xs", expired ? "text-muted-foreground italic" : "text-navy/80 font-medium")}>
      {expired ? `Ended at ${formatClock(until)} · awaiting update` : `until ${formatClock(until)}`}
    </span>
  );
}
