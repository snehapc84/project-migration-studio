import type { ReactNode } from "react";
import { Logo } from "./Logo";

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-soft">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">{children}</nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>
          <span className="font-display font-semibold text-navy">Lecturer Connect</span> · Find your lecturer, at the right time.
        </p>
        <p>Phone numbers are private and never shown to students.</p>
      </div>
    </footer>
  );
}
