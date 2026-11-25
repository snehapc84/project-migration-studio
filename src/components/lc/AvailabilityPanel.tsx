import { useQueryClient } from "@tanstack/react-query";
import { cva } from "class-variance-authority";
import { CircleCheck, CircleMinus, Clock, Loader2, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Lecturer } from "@/lib/queries";
import { STATUS_META, formatRelative, untilFromTime, type AvailabilityStatus } from "@/lib/status";
import { Field } from "./TimetableEntryDialog";
import { StatusBadge, StatusUntil } from "./StatusBadge";

const statusButton = cva(
  "relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-6 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 sm:py-8",
  {
    variants: {
      status: {
        available: "border-available/40 bg-available-soft text-available-foreground hover:border-available",
        busy: "border-busy/50 bg-busy-soft text-busy-foreground hover:border-busy",
        absent: "border-absent/40 bg-absent-soft text-absent-foreground hover:border-absent",
      },
      active: { true: "shadow-lift scale-[1.02]", false: "hover:-translate-y-0.5" },
    },
    compoundVariants: [
      { status: "available", active: true, className: "border-available bg-available text-primary-foreground" },
      { status: "busy", active: true, className: "border-busy bg-busy text-navy-deep" },
      { status: "absent", active: true, className: "border-absent bg-absent text-primary-foreground" },
    ],
  },
);

const ICONS = { available: CircleCheck, busy: CircleMinus, absent: UserX } as const;

export function AvailabilityPanel({ lecturer, now }: { lecturer: Lecturer; now: Date }) {
  const queryClient = useQueryClient();
  const [untilTime, setUntilTime] = useState("");
  const [note, setNote] = useState(lecturer.status_note ?? "");
  const [pending, setPending] = useState<AvailabilityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(status: AvailabilityStatus, opts?: { clearUntil?: boolean }) {
    setError(null);
    let statusUntil: string | null = null;
    if (status !== "absent" && untilTime && !opts?.clearUntil) {
      statusUntil = untilFromTime(untilTime, new Date());
      if (!statusUntil) {
        setError("Pick an 'until' time later than now, or leave it empty.");
        return;
      }
    }
    const trimmedNote = note.trim();
    if (trimmedNote.length > 140) {
      setError("Note must be 140 characters or fewer.");
      return;
    }
    setPending(status);
    const { error: updateError } = await supabase
      .from("lecturers")
      .update({ status, status_until: statusUntil, status_note: trimmedNote || null })
      .eq("id", lecturer.id);
    setPending(null);
    if (updateError) {
      setError("Couldn't update your status. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["lecturers"] });
    setUntilTime("");
    toast.success(`You're now ${STATUS_META[status].label.toLowerCase()}`, {
      description: "Students can see this immediately.",
    });
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cobalt">Availability</p>
          <h2 className="font-display text-2xl font-semibold text-navy">Set your status</h2>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <StatusBadge status={lecturer.status} />
          <StatusUntil until={lecturer.status_until} now={now} />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" /> Updated {formatRelative(lecturer.status_updated_at, now)}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
        {(["available", "busy", "absent"] as const).map((s) => {
          const Icon = ICONS[s];
          const active = lecturer.status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => update(s)}
              disabled={pending !== null}
              aria-pressed={active}
              className={statusButton({ status: s, active })}
            >
              {pending === s ? <Loader2 className="size-8 animate-spin" /> : <Icon className="size-8" />}
              <span className="text-sm font-bold uppercase tracking-wider sm:text-base">{STATUS_META[s].label}</span>
              <span className={cn("hidden text-xs sm:block", active ? "opacity-90" : "opacity-75")}>
                {STATUS_META[s].description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl bg-ice-soft p-4 sm:grid-cols-[180px_1fr]">
        <Field label="Until (optional)" htmlFor="status-until" hint="e.g. Busy until 12:30 PM">
          <Input id="status-until" type="time" value={untilTime} onChange={(e) => setUntilTime(e.target.value)} />
        </Field>
        <Field label="Note for students (optional)" htmlFor="status-note" hint={`${note.length}/140`}>
          <Input
            id="status-note"
            placeholder="e.g. In staff room B-204 · Department meeting"
            value={note}
            maxLength={140}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Choose a time and note first, then tap a status button to apply them. Absent ignores the time.
        </p>
      </div>

      {lecturer.status_until && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={() => update(lecturer.status, { clearUntil: true })}
          disabled={pending !== null}
        >
          Remove the "until" time
        </Button>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-absent-soft px-3.5 py-2.5 text-sm text-absent-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
