import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { DAYS, toMinutes, type TimetableEntry } from "@/lib/timetable";

const entrySchema = z
  .object({
    day_of_week: z.coerce.number().int().min(1).max(7),
    start_time: z.string().regex(/^\d{2}:\d{2}/, "Choose a start time."),
    end_time: z.string().regex(/^\d{2}:\d{2}/, "Choose an end time."),
    subject: z.string().trim().min(1, "Enter the subject name.").max(120, "Subject must be under 120 characters."),
    room: z.string().trim().min(1, "Enter the classroom or lab.").max(60, "Room must be under 60 characters."),
  })
  .refine((v) => toMinutes(v.end_time) > toMinutes(v.start_time), {
    message: "End time must be after the start time.",
    path: ["end_time"],
  });

type FormState = { day_of_week: string; start_time: string; end_time: string; subject: string; room: string };
type Errors = { [K in keyof FormState | "form"]?: string | undefined };

const EMPTY: FormState = { day_of_week: "1", start_time: "09:00", end_time: "10:00", subject: "", room: "" };

export function TimetableEntryDialog({
  open,
  onOpenChange,
  lecturerId,
  entry,
  defaultDay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lecturerId: string;
  entry: TimetableEntry | null;
  defaultDay?: number | undefined;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      entry
        ? {
            day_of_week: String(entry.day_of_week),
            start_time: entry.start_time.slice(0, 5),
            end_time: entry.end_time.slice(0, 5),
            subject: entry.subject,
            room: entry.room,
          }
        : { ...EMPTY, day_of_week: String(defaultDay ?? 1) },
    );
  }, [open, entry, defaultDay]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = entrySchema.safeParse(form);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof FormState] ??= issue.message;
      setErrors(next);
      return;
    }
    setSaving(true);
    const payload = { ...parsed.data, lecturer_id: lecturerId };
    const { error } = entry
      ? await supabase.from("timetable_entries").update(parsed.data).eq("id", entry.id)
      : await supabase.from("timetable_entries").insert(payload);
    setSaving(false);
    if (error) {
      const message = error.message.includes("overlaps")
        ? "This time overlaps with another class on the same day. Pick a different time."
        : "Couldn't save this class. Please try again.";
      setErrors({ form: message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["timetable", lecturerId] });
    toast.success(entry ? "Class updated" : "Class added", { description: "Students can see the change right away." });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-navy">{entry ? "Edit class" : "Add a class"}</DialogTitle>
          <DialogDescription>Saved instantly to your weekly timetable.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Day of the week" htmlFor="tt-day" error={errors.day_of_week}>
            <select
              id="tt-day"
              value={form.day_of_week}
              onChange={(e) => set("day_of_week", e.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-base text-foreground shadow-sm focus-visible:border-cobalt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time" htmlFor="tt-start" error={errors.start_time}>
              <Input
                id="tt-start"
                type="time"
                value={form.start_time}
                onChange={(e) => set("start_time", e.target.value)}
                aria-invalid={!!errors.start_time}
              />
            </Field>
            <Field label="End time" htmlFor="tt-end" error={errors.end_time}>
              <Input
                id="tt-end"
                type="time"
                value={form.end_time}
                onChange={(e) => set("end_time", e.target.value)}
                aria-invalid={!!errors.end_time}
              />
            </Field>
          </div>
          <Field label="Subject" htmlFor="tt-subject" error={errors.subject}>
            <Input
              id="tt-subject"
              placeholder="e.g. Data Structures"
              value={form.subject}
              maxLength={120}
              onChange={(e) => set("subject", e.target.value)}
              aria-invalid={!!errors.subject}
            />
          </Field>
          <Field label="Classroom or laboratory" htmlFor="tt-room" error={errors.room}>
            <Input
              id="tt-room"
              placeholder="e.g. CSE-101 or Computer Lab 2"
              value={form.room}
              maxLength={60}
              onChange={(e) => set("room", e.target.value)}
              aria-invalid={!!errors.room}
            />
          </Field>
          {errors.form && (
            <p role="alert" className="rounded-xl bg-absent-soft px-3 py-2 text-sm text-absent-foreground">
              {errors.form}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : entry ? "Save changes" : "Add class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-navy">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
