import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Search, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { LecturerCard } from "@/components/lc/LecturerCard";
import { LogoutButton } from "@/components/lc/LogoutButton";
import { PageLoading } from "@/components/lc/PageStates";
import { SiteFooter, SiteHeader } from "@/components/lc/SiteHeader";
import { cn } from "@/lib/utils";
import { lecturersQuery, myStudentQuery, useLiveUpdates, useNow } from "@/lib/queries";
import { STATUS_META, type AvailabilityStatus } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/student/")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — Lecturer Connect" },
      { name: "description", content: "Search lecturers and check who is available right now." },
      { property: "og:title", content: "Student Dashboard — Lecturer Connect" },
      { property: "og:description", content: "Search lecturers and check who is available right now." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: ({ context }) => {
    if (context.role !== "student") throw redirect({ to: context.role === "lecturer" ? "/lecturer" : "/" });
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(lecturersQuery()),
      context.queryClient.ensureQueryData(myStudentQuery(context.user.id)),
    ]);
  },
  pendingComponent: () => <PageLoading label="Loading lecturers…" />,
  component: StudentDashboard,
});

type StatusFilter = "all" | AvailabilityStatus;

function StudentDashboard() {
  const { user } = Route.useRouteContext();
  const { data: lecturers } = useSuspenseQuery(lecturersQuery());
  const { data: student } = useSuspenseQuery(myStudentQuery(user.id));
  useLiveUpdates();
  const now = useNow();

  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const departments = useMemo(
    () => Array.from(new Set(lecturers.map((l) => l.department))).sort(),
    [lecturers],
  );

  const counts = useMemo(() => {
    const c = { available: 0, busy: 0, absent: 0 };
    for (const l of lecturers) c[l.status]++;
    return c;
  }, [lecturers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lecturers.filter(
      (l) =>
        (department === "all" || l.department === department) &&
        (status === "all" || l.status === status) &&
        (!q || l.name.toLowerCase().includes(q) || l.department.toLowerCase().includes(q)),
    );
  }, [lecturers, query, department, status]);

  const firstName = (student?.name ?? "Student").split(" ")[0];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        <span className="hidden text-sm text-primary-foreground/80 sm:inline">{student?.name}</span>
        <LogoutButton />
      </SiteHeader>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <section className="animate-fade-up">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cobalt">Student dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-navy sm:text-4xl">Welcome, {firstName}</h1>
          <p className="mt-2 text-muted-foreground">Find a lecturer and check when they're free to meet.</p>
        </section>

        <section className="mt-6 grid grid-cols-3 gap-3 sm:max-w-xl">
          {(["available", "busy", "absent"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(status === s ? "all" : s)}
              aria-pressed={status === s}
              className={cn(
                "rounded-2xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4",
                s === "available" && "border-available/30 bg-available-soft text-available-foreground",
                s === "busy" && "border-busy/40 bg-busy-soft text-busy-foreground",
                s === "absent" && "border-absent/30 bg-absent-soft text-absent-foreground",
                status === s ? "ring-2 ring-navy/40 shadow-soft" : "hover:-translate-y-0.5",
              )}
            >
              <span className="block font-display text-2xl font-semibold sm:text-3xl">{counts[s]}</span>
              <span className="text-xs font-semibold uppercase tracking-wide">{STATUS_META[s].label}</span>
            </button>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <label htmlFor="lecturer-search" className="sr-only">
            Search lecturers by name or department
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-cobalt" />
            <Input
              id="lecturer-search"
              type="search"
              placeholder="Search by lecturer name or department…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 pl-12 pr-10 text-base"
              maxLength={80}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-ice hover:text-navy"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by department">
            {["all", ...departments].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDepartment(d)}
                aria-pressed={department === d}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  department === d
                    ? "border-navy bg-navy text-primary-foreground"
                    : "border-border bg-card text-navy hover:border-cobalt hover:bg-ice",
                )}
              >
                {d === "all" ? "All departments" : d}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8" aria-live="polite">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-navy">Lecturer directory</h2>
            <span className="text-sm text-muted-foreground">
              {filtered.length} of {lecturers.length}
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-cobalt/50 bg-card px-6 py-14 text-center">
              <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-ice text-navy">
                <UsersRound className="size-6" />
              </div>
              <p className="font-display text-xl font-semibold text-navy">No lecturers match your search</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different name, or clear the filters.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setDepartment("all");
                  setStatus("all");
                }}
                className="mt-4 text-sm font-semibold text-cobalt underline-offset-4 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((l, i) => (
                <LecturerCard key={l.id} lecturer={l} now={now} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
