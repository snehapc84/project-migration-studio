import { Clock, MapPin, Pencil, Trash2, CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatTime,
  isoWeekday,
  sortEntries,
  toMinutes,
  visibleDays,
  type TimetableEntry,
} from "@/lib/timetable";

export function TimetableView({
  entries,
  now,
  editable = false,
  onEdit,
  onDelete,
}: {
  entries: TimetableEntry[];
  now: Date;
  editable?: boolean;
  onEdit?: (entry: TimetableEntry) => void;
  onDelete?: (entry: TimetableEntry) => void;
}) {
  const sorted = sortEntries(entries);
  const today = isoWeekday(now);
  const nowMins = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleDays(entries).map((day) => {
        const dayEntries = sorted.filter((e) => e.day_of_week === day.value);
        const isToday = day.value === today;
        return (
          <section
            key={day.value}
            aria-label={`${day.label} timetable`}
            className={cn(
              "flex flex-col rounded-2xl border bg-card p-4 shadow-soft",
              isToday ? "border-cobalt ring-2 ring-cobalt/25" : "border-border",
            )}
          >
            <header className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-navy">{day.label}</h3>
              <div className="flex items-center gap-2">
                {isToday && (
                  <span className="rounded-full bg-butter px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-navy">
                    Today
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {dayEntries.length} {dayEntries.length === 1 ? "class" : "classes"}
                </span>
              </div>
            </header>

            {dayEntries.length === 0 ? (
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-muted px-3 py-4 text-sm text-muted-foreground">
                <CalendarX2 className="size-4" /> No classes
              </div>
            ) : (
              <ul className="space-y-2">
                {dayEntries.map((entry) => {
                  const live =
                    isToday && toMinutes(entry.start_time) <= nowMins && nowMins < toMinutes(entry.end_time);
                  return (
                    <li
                      key={entry.id}
                      className={cn(
                        "group rounded-xl border-l-4 px-3 py-2.5 transition-colors",
                        live ? "border-l-busy bg-busy-soft" : "border-l-cobalt bg-ice-soft hover:bg-ice",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-navy/80">
                            <Clock className="size-3.5 text-cobalt" />
                            {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                            {live && (
                              <span className="ml-1 rounded-full bg-busy px-1.5 text-[10px] uppercase text-navy-deep">
                                Now
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 truncate font-semibold text-navy">{entry.subject}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="size-3.5" />
                            {entry.room}
                          </p>
                        </div>
                        {editable && (
                          <div className="flex shrink-0 gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              onClick={() => onEdit?.(entry)}
                              aria-label={`Edit ${entry.subject} on ${day.label}`}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 hover:bg-absent-soft hover:text-absent-foreground"
                              onClick={() => onDelete?.(entry)}
                              aria-label={`Delete ${entry.subject} on ${day.label}`}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
