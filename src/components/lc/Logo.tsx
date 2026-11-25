import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden="true">
      <rect width="40" height="40" rx="12" className="fill-butter" />
      <path d="M8 16 20 10l12 6-12 6-12-6Z" className="fill-navy" />
      <path d="M13 19v6c0 2 3.2 4 7 4s7-2 7-4v-6l-7 3.5L13 19Z" className="fill-cobalt" />
      <circle cx="31" cy="25" r="2.2" className="fill-navy" />
      <path d="M31 16v8" strokeWidth="1.6" strokeLinecap="round" className="stroke-navy" />
    </svg>
  );
}

export function Logo({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="Lecturer Connect home">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span
        className={cn(
          "font-display text-xl font-semibold",
          tone === "light" ? "text-primary-foreground" : "text-navy",
        )}
      >
        Lecturer <span className={tone === "light" ? "text-butter" : "text-cobalt"}>Connect</span>
      </span>
    </Link>
  );
}
