import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Building2, CalendarClock, Clock, MapPin, MessageSquareText, UserX } from "lucide-react";
import { LecturerAvatar } from "@/components/lc/LecturerAvatar";
import { MessageLecturerButton } from "@/components/lc/MessageLecturerButton";
import { LogoutButton } from "@/components/lc/LogoutButton";
import { PageLoading } from "@/components/lc/PageStates";
import { SiteFooter, SiteHeader } from "@/components/lc/SiteHeader";
import { StatusBadge, StatusUntil } from "@/components/lc/StatusBadge";
import { TimetableView } from "@/components/lc/TimetableView";
import { Button } from "@/components/ui/button";
import { lecturerQuery, timetableQuery, useLiveUpdates, useNow, type Lecturer } from "@/lib/queries";
import { STATUS_META, formatRelative } from "@/lib/status";
import { currentClass, formatTime, type TimetableEntry } from "@/lib/timetable";

export const Route = createFileRoute("/_authenticated/student/lecturers/$lecturerId")({
  head: () => ({
    meta: [
      { title: "Lecturer Profile — Lecturer Connect" },
      { name: "description", content: "Lecturer availability and weekly timetable." },
      { property: "og:title", content: "Lecturer Profile — Lecturer Connect" },
      { property: "og:description", content: "Lecturer availability and weekly timetable." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: ({ context }) => {
    if (context.role !== "student") throw redirect({ to: context.role === "lecturer" ? "/lecturer" : "/" });
  },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(lecturerQuery(params.lecturerId)),
      context.queryClient.ensureQueryData(timetableQuery(params.lecturerId)),
    ]);
  },
  pendingComponent: () => <PageLoading label="Loading profile…" />,
  component: LecturerProfile,
});

function LecturerProfile() {
  const { lecturerId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { data: lecturer } = useSuspenseQuery(lecturerQuery(lecturerId));
  const { data: entries } = useSuspenseQuery(timetableQuery(lecturerId));
  useLiveUpdates();
  const now = useNow();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        <LogoutButton />
      </SiteHeader>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          to="/student"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-navy"
        >
          <ArrowLeft className="size-4" /> Back to directory
        </Link>

        {!lecturer ? (
          <div className="flex flex-col items-center rounded-3xl border border-border bg-card px-6 py-16 text-center shadow-soft">
            <UserX className="mb-3 size-10 text-cobalt" />
            <h1 className="font-display text-2xl font-semibold text-navy">Lecturer not found</h1>
            <p className="mt-1 text-muted-foreground">This profile may have been removed.</p>
            <Button asChild className="mt-5">
              <Link to="/student">Browse lecturers</Link>
            </Button>
          </div>
        ) : (
          <ProfileBody lecturer={lecturer} entries={entries} now={now} studentId={user.id} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function ProfileBody({
  lecturer,
  entries,
  now,
  studentId,
}: {
  lecturer: Lecturer;
  entries: TimetableEntry[];
  now: Date;
  studentId: string;
}) {
  const inClass = currentClass(entries, now);

  return (
    <>
      <section className="grid animate-fade-up gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <LecturerAvatar name={lecturer.name} id={lecturer.id} size="lg" />
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-semibold text-navy sm:text-4xl">{lecturer.name}</h1>
              <p className="mt-1 flex items-center gap-2 font-medium text-cobalt">
                <BookOpen className="size-4" /> {lecturer.designation}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-muted-foreground">
                <Building2 className="size-4" /> {lecturer.department}
              </p>
              {lecturer.is_demo && (
                <span className="mt-3 inline-block rounded-full bg-butter px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-navy/70">
                  Demo profile · sample data
                </span>
              )}
              <div>
                <MessageLecturerButton lecturerId={lecturer.id} lecturerName={lecturer.name} studentId={studentId} />
              </div>
            </div>
          </div>
        </div>

        <div
          className={
            lecturer.status === "available"
              ? "rounded-3xl border border-available/30 bg-available-soft p-6 shadow-soft sm:p-7"
              : lecturer.status === "busy"
                ? "rounded-3xl border border-busy/40 bg-busy-soft p-6 shadow-soft sm:p-7"
                : "rounded-3xl border border-absent/30 bg-absent-soft p-6 shadow-soft sm:p-7"
          }
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy/60">Current availability</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge status={lecturer.status} size="lg" />
            <StatusUntil until={lecturer.status_until} now={now} />
          </div>
          <p className="mt-3 text-navy/80">{STATUS_META[lecturer.status].description}.</p>
          {lecturer.status_note && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-card/70 px-3 py-2 text-sm text-navy">
              <MessageSquareText className="mt-0.5 size-4 shrink-0 text-cobalt" /> {lecturer.status_note}
            </p>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-xs text-navy/60">
            <Clock className="size-3.5" /> Status updated {formatRelative(lecturer.status_updated_at, now)}
          </p>
        </div>
      </section>

      {inClass && lecturer.status !== "absent" && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-butter-strong bg-butter px-5 py-4 text-navy">
          <CalendarClock className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">In class right now:</span> {inClass.subject} ·{" "}
            <MapPin className="inline size-3.5" /> {inClass.room} until {formatTime(inClass.end_time)}
          </p>
        </div>
      )}

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cobalt">Weekly timetable</p>
            <h2 className="font-display text-2xl font-semibold text-navy">Classes this week</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Last updated {formatRelative(lecturer.timetable_updated_at, now)}
          </p>
        </div>
        <TimetableView entries={entries} now={now} />
      </section>
    </>
  );
}
