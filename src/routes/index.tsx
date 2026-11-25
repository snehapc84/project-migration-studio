import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpenCheck, CalendarDays, GraduationCap, Presentation, Search, Signal } from "lucide-react";
import heroAsset from "@/assets/hero-campus.jpg.asset.json";
const heroImage = heroAsset.url;
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/lc/LogoutButton";
import { SiteFooter, SiteHeader } from "@/components/lc/SiteHeader";
import { StatusBadge } from "@/components/lc/StatusBadge";
import { useSessionRole } from "@/hooks/use-session-role";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lecturer Connect — Find your lecturer at the right time" },
      {
        name: "description",
        content:
          "Lecturer Connect helps college students find lecturers, check live availability and view weekly timetables in one place.",
      },
      { property: "og:title", content: "Lecturer Connect — Find your lecturer at the right time" },
      {
        property: "og:description",
        content: "Check if a lecturer is available, busy or absent and see their weekly timetable — no more searching the corridors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { role } = useSessionRole();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        {role ? (
          <>
            <Button asChild variant="navSolid" size="sm">
              <Link to={role === "student" ? "/student" : "/lecturer"}>Open dashboard</Link>
            </Button>
            <LogoutButton />
          </>
        ) : (
          <>
            <Button asChild variant="nav" size="sm">
              <Link to="/login/student">Student login</Link>
            </Button>
            <Button asChild variant="navSolid" size="sm">
              <Link to="/login/lecturer">Lecturer login</Link>
            </Button>
          </>
        )}
      </SiteHeader>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-hero">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:pb-24 lg:pt-20">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-butter-strong bg-butter px-3 py-1 text-xs font-semibold text-navy">
                <Signal className="size-3.5" /> Live lecturer availability
              </span>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] text-navy sm:text-5xl lg:text-6xl">
                Find Your Lecturer.
                <br />
                <span className="text-cobalt">Connect at the Right Time.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
                No more waiting outside staff rooms. See who's available, busy or absent, and check their weekly
                timetable before you walk across campus.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <StatusBadge status="available" size="sm" />
                <StatusBadge status="busy" size="sm" />
                <StatusBadge status="absent" size="sm" />
              </div>
            </div>
            <div className="relative animate-fade-up [animation-delay:120ms]">
              <div className="absolute -inset-3 -z-0 rotate-2 rounded-[2rem] bg-butter" aria-hidden="true" />
              <img
                src={heroImage}
                alt="A lecturer chatting with two students in a bright college library"
                width={1280}
                height={1024}
                className="relative rounded-[1.75rem] border-4 border-card object-cover shadow-lift"
              />
            </div>
          </div>
        </section>

        {/* Login cards */}
        <section className="mx-auto -mt-8 max-w-6xl px-4 sm:px-6" aria-labelledby="choose-login">
          <h2 id="choose-login" className="sr-only">
            Choose how to log in
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <LoginCard
              to="/login/student"
              icon={<GraduationCap className="size-7" />}
              title="Student Login"
              text="Search lecturers by name or department, check their status and view weekly timetables."
              cta="Continue as student"
              tone="ice"
            />
            <LoginCard
              to="/login/lecturer"
              icon={<Presentation className="size-7" />}
              title="Lecturer Login"
              text="Update your availability in one tap and keep your weekly timetable up to date for students."
              cta="Continue as lecturer"
              tone="butter"
            />
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mb-10 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cobalt">How it works</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-navy sm:text-4xl">
              Less searching, more learning.
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { icon: Search, title: "Search", text: "Find any lecturer by name or department in seconds." },
              { icon: Signal, title: "Check status", text: "See if they're available, busy or absent — updated live." },
              { icon: CalendarDays, title: "Plan your visit", text: "View their weekly timetable and pick the right time." },
            ].map(({ icon: Icon, title, text }, i) => (
              <div
                key={title}
                className="animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-soft"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-4 grid size-11 place-items-center rounded-xl bg-ice text-navy">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-display text-xl font-semibold text-navy">{title}</h3>
                <p className="mt-1.5 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-butter-strong bg-butter px-5 py-4 text-sm text-navy">
            <BookOpenCheck className="mt-0.5 size-5 shrink-0" />
            <p>
              Demo mode: six fictional lecturers are included so you can try everything. Lecturer demo logins are listed
              on the lecturer login page.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function LoginCard({
  to,
  icon,
  title,
  text,
  cta,
  tone,
}: {
  to: "/login/student" | "/login/lecturer";
  icon: ReactNode;
  title: string;
  text: string;
  cta: string;
  tone: "ice" | "butter";
}) {
  return (
    <Link
      to={to}
      className="group card-lift relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-8"
    >
      <div
        className={
          tone === "ice"
            ? "absolute -right-10 -top-10 size-40 rounded-full bg-ice transition-transform duration-500 group-hover:scale-125"
            : "absolute -right-10 -top-10 size-40 rounded-full bg-butter transition-transform duration-500 group-hover:scale-125"
        }
        aria-hidden="true"
      />
      <div className="relative mb-5 grid size-14 place-items-center rounded-2xl bg-primary text-butter">{icon}</div>
      <h3 className="relative font-display text-2xl font-semibold text-navy">{title}</h3>
      <p className="relative mt-2 max-w-sm text-muted-foreground">{text}</p>
      <span className="relative mt-6 inline-flex items-center gap-2 font-semibold text-navy">
        {cta}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
