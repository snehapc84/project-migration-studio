import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { Lecturer } from "@/lib/queries";
import { LecturerAvatar } from "./LecturerAvatar";
import { StatusBadge, StatusUntil } from "./StatusBadge";

export function LecturerCard({ lecturer, now, index = 0 }: { lecturer: Lecturer; now: Date; index?: number }) {
  return (
    <Link
      to="/student/lecturers/$lecturerId"
      params={{ lecturerId: lecturer.id }}
      className="group card-lift flex animate-fade-up flex-col rounded-2xl border border-border bg-card p-5 shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <div className="flex items-start gap-4">
        <LecturerAvatar name={lecturer.name} id={lecturer.id} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-semibold text-navy">{lecturer.name}</h3>
          <p className="truncate text-sm font-medium text-cobalt">{lecturer.designation}</p>
          <p className="truncate text-sm text-muted-foreground">{lecturer.department}</p>
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between gap-2 border-t border-border pt-4">
        <div className="flex flex-col gap-1">
          <StatusBadge status={lecturer.status} size="sm" />
          <StatusUntil until={lecturer.status_until} now={now} />
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-navy/70 transition-colors group-hover:text-navy">
          View profile <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      {lecturer.is_demo && (
        <span className="mt-3 self-start rounded-full bg-butter px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy/70">
          Demo profile
        </span>
      )}
    </Link>
  );
}
