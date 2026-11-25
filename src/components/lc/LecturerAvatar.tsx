import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatar = cva("grid shrink-0 place-items-center rounded-2xl font-display font-semibold", {
  variants: {
    tone: {
      ice: "bg-ice text-navy",
      butter: "bg-butter text-navy",
      cobalt: "bg-cobalt-soft text-navy-deep",
      navy: "bg-navy text-butter",
    },
    size: {
      sm: "size-12 text-base",
      md: "size-16 text-xl",
      lg: "size-24 text-3xl rounded-3xl",
    },
  },
  defaultVariants: { size: "md" },
});

const TONES = ["ice", "butter", "cobalt", "navy"] as const;

export function initials(name: string) {
  const parts = name
    .replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

export function LecturerAvatar({
  name,
  id,
  size,
  className,
}: {
  name: string;
  id: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hash = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const tone = TONES[hash % TONES.length];
  return (
    <div className={cn(avatar({ tone, size }), className)} role="img" aria-label={`${name} avatar`}>
      {initials(name)}
    </div>
  );
}
