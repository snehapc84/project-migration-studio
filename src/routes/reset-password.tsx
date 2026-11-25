import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginLayout } from "@/components/lc/LoginLayout";
import { Field } from "@/components/lc/TimetableEntryDialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Lecturer Connect" },
      { name: "description", content: "Choose a new password for your lecturer account." },
      { property: "og:title", content: "Reset password — Lecturer Connect" },
      { property: "og:description", content: "Choose a new password for your lecturer account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) return setError("Couldn't update your password. The link may have expired — request a new one.");
    navigate({ to: "/lecturer", replace: true });
  }

  return (
    <LoginLayout
      icon={<KeyRound className="size-7" />}
      eyebrow="For lecturers"
      title="Choose a new password"
      subtitle="Enter a new password for your lecturer account."
      switchTo={{ to: "/login/lecturer", label: "Back to log in" }}
      aside={null}
    >
      {!ready ? (
        <p className="text-sm text-muted-foreground">
          Open this page from the reset link in your email. If the link has expired, request a new one from the lecturer
          login page.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Field label="New password" htmlFor="new-pass">
            <Input id="new-pass" type="password" autoComplete="new-password" value={password} maxLength={72} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password" htmlFor="new-confirm">
            <Input id="new-confirm" type="password" autoComplete="new-password" value={confirm} maxLength={72} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {error && (
            <p role="alert" className="rounded-xl border border-absent/30 bg-absent-soft px-3.5 py-2.5 text-sm text-absent-foreground">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin" /> : null}
            Save new password
          </Button>
        </form>
      )}
    </LoginLayout>
  );
}
