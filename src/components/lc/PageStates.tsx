import { Loader2 } from "lucide-react";

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-5 animate-spin text-cobalt" /> {label}
    </div>
  );
}
