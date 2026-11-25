import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "./SiteHeader";

export function LoginLayout({
  icon,
  eyebrow,
  title,
  subtitle,
  aside,
  switchTo,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  aside: ReactNode;
  switchTo: { to: "/login/student" | "/login/lecturer"; label: string };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <SiteHeader>
        <Button asChild variant="nav" size="sm">
          <Link to={switchTo.to}>{switchTo.label}</Link>
        </Button>
      </SiteHeader>
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div className="animate-fade-up">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-navy"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-lift sm:p-9">
            <div className="mb-6 flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-2xl bg-ice text-navy">{icon}</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cobalt">{eyebrow}</p>
                <h1 className="font-display text-3xl font-semibold text-navy">{title}</h1>
              </div>
            </div>
            <p className="mb-7 text-muted-foreground">{subtitle}</p>
            {children}
          </div>
        </div>
        <aside className="animate-fade-up [animation-delay:120ms]">{aside}</aside>
      </main>
      <SiteFooter />
    </div>
  );
}
