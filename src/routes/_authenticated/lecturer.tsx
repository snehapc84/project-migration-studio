import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { BookOpen, Building2, CalendarPlus, FlaskConical, Pencil, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AvailabilityPanel } from "@/components/lc/AvailabilityPanel";
import { EditProfileDialog } from "@/components/lc/EditProfileDialog";
import { LecturerAvatar } from "@/components/lc/LecturerAvatar";
import { LecturerInbox } from "@/components/lc/LecturerInbox";
import { LogoutButton } from "@/components/lc/LogoutButton";
import { PageLoading } from "@/components/lc/PageStates";
import { SiteFooter, SiteHeader } from "@/components/lc/SiteHeader";
import { TimetableEntryDialog } from "@/components/lc/TimetableEntryDialog";
import { TimetableView } from "@/components/lc/TimetableView";
import { supabase } from "@/integrations/supabase/client";
import { myLecturerQuery, timetableQuery, useLiveUpdates, useNow, type Lecturer } from "@/lib/queries";
import { formatRelative } from "@/lib/status";
import { DAYS, formatTime, isoWeekday, type TimetableEntry } from "@/lib/timetable";

export const Route = createFileRoute("/_authenticated/lecturer")({
  head: () => ({
    meta: [
      { title: "Lecturer Dashboard — Lecturer Connect" },
      { name: "description", content: "Update your availability and manage your weekly timetable." },
      { property: "og:title", content: "Lecturer Dashboard — Lecturer Connect" },
      { property: "og:description", content: "Update your availability and manage your weekly timetable." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: ({ context }) => {
    if (context.role !== "lecturer") throw redirect({ to: context.role === "student" ? "/student" : "/" });
  },
  loader: async ({ context }) => {
    const lecturer = await context.queryClient.ensureQueryData(myLecturerQuery(context.user.id));
    if (lecturer) await context.queryClient.ensureQueryData(timetableQuery(lecturer.id));
  },
  pendingComponent: () => <PageLoading label="Loading your dashboard…" />,
  component: LecturerDashboard,
});

function LecturerDashboard() {
  const { user } = Route.useRouteContext();
  const { data: lecturer } = useSuspenseQuery(myLecturerQuery(user.id));
  useLiveUpdates();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        {lecturer && <span className="hidden text-sm text-primary-foreground/80 sm:inline">{lecturer.name}</span>}
        <LogoutButton />
      </SiteHeader>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {lecturer ? (
          <Dashboard lecturer={lecturer} />
        ) : (
          <div className="flex flex-col items-center rounded-3xl border border-border bg-card px-6 py-16 text-center shadow-soft">
            <UserX className="mb-3 size-10 text-cobalt" />
            <h1 className="font-display text-2xl font-semibold text-navy">No lecturer profile linked</h1>
            <p className="mt-1 max-w-md text-muted-foreground">
              Your account isn't connected to a lecturer profile yet. Please contact the college office.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Dashboard({ lecturer }: { lecturer: Lecturer }) {
  const queryClient = useQueryClient();
  const { data: entries } = useSuspenseQuery(timetableQuery(lecturer.id));
  const now = useNow();

  const [profileOpen, setProfileOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableEntry | null>(null);
  const [deleting, setDeleting] = useState<TimetableEntry | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const todayCount = entries.filter((e) => e.day_of_week === isoWeekday(now)).length;

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    const { error } = await supabase.from("timetable_entries").delete().eq("id", deleting.id);
    setDeletingBusy(false);
    if (error) {
      toast.error("Couldn't delete this class. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["timetable", lecturer.id] });
    toast.success("Class removed");
    setDeleting(null);
  }

  return (
    <>
      <section className="animate-fade-up">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cobalt">Lecturer dashboard</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-navy sm:text-4xl">Welcome, {lecturer.name}</h1>
        <p className="mt-2 text-muted-foreground">
          You have {todayCount} {todayCount === 1 ? "class" : "classes"} today. Keep your status current so students
          know when to find you.
        </p>
        {lecturer.is_demo && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-butter-strong bg-butter px-4 py-3 text-sm text-navy">
            <FlaskConical className="mt-0.5 size-4 shrink-0" />
            <p>
              <span className="font-semibold">Demo account.</span> This profile and timetable are sample data — feel
              free to edit or replace anything.
            </p>
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-start justify-between">
            <LecturerAvatar name={lecturer.name} id={lecturer.id} size="lg" />
            <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)}>
              <Pencil /> Edit
            </Button>
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-navy">{lecturer.name}</h2>
          <p className="mt-1 flex items-center gap-2 font-medium text-cobalt">
            <BookOpen className="size-4" /> {lecturer.designation}
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-muted-foreground">
            <Building2 className="size-4" /> {lecturer.department}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5 text-sm">
            <div>
              <dt className="text-muted-foreground">Classes / week</dt>
              <dd className="font-display text-2xl font-semibold text-navy">{entries.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Timetable updated</dt>
              <dd className="font-medium text-navy">{formatRelative(lecturer.timetable_updated_at, now)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">Your phone number is private and never shown to students.</p>
        </div>

        <AvailabilityPanel key={lecturer.id} lecturer={lecturer} now={now} />
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cobalt">Timetable management</p>
            <h2 className="font-display text-2xl font-semibold text-navy">Your weekly timetable</h2>
            <p className="text-sm text-muted-foreground">Changes save instantly and appear for students right away.</p>
          </div>
          <Button
            size="lg"
            onClick={() => {
              setEditing(null);
              setEntryOpen(true);
            }}
          >
            <CalendarPlus /> Add class
          </Button>
        </div>
        <TimetableView
          entries={entries}
          now={now}
          editable
          onEdit={(entry) => {
            setEditing(entry);
            setEntryOpen(true);
          }}
          onDelete={setDeleting}
        />
      </section>

      <LecturerInbox lecturerId={lecturer.id} />

      <EditProfileDialog open={profileOpen} onOpenChange={setProfileOpen} lecturer={lecturer} />
      <TimetableEntryDialog
        open={entryOpen}
        onOpenChange={setEntryOpen}
        lecturerId={lecturer.id}
        entry={editing}
        defaultDay={Math.min(isoWeekday(now), 6)}
      />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-navy">Delete this class?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                `${deleting.subject} on ${DAYS.find((d) => d.value === deleting.day_of_week)?.label}, ${formatTime(deleting.start_time)} – ${formatTime(deleting.end_time)} will be removed from your timetable.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deletingBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingBusy ? "Deleting…" : "Delete class"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
