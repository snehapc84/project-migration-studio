import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Phone, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { phoneLogin } from "@/lib/auth.functions";
import { loginSchema } from "@/lib/validation";
import { Field } from "./TimetableEntryDialog";

type Role = "student";

export function LoginForm({
  role,
  prefill,
}: {
  role: Role;
  prefill?: { name: string; phone: string } | null | undefined;
}) {
  const navigate = useNavigate();
  const login = useServerFn(phoneLogin);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string | undefined; phone?: string | undefined; form?: string | undefined }>({});
  const [submitting, setSubmitting] = useState(false);

  const [lastPrefill, setLastPrefill] = useState(prefill);
  if (prefill !== lastPrefill) {
    setLastPrefill(prefill);
    if (prefill) {
      setName(prefill.name);
      setPhone(prefill.phone);
      setErrors({});
    }
  }

  const label = role === "student" ? "Student" : "Lecturer";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ name, phone });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "name" | "phone";
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const result = await login({ data: { ...parsed.data, role } });
      if (!result.ok) {
        setErrors({ form: result.error });
        return;
      }
      const { error } = await supabase.auth.verifyOtp({ token_hash: result.tokenHash, type: "magiclink" });
      if (error) {
        setErrors({ form: "We couldn't start your session. Please try again." });
        return;
      }
      navigate({ to: role === "student" ? "/student" : "/lecturer", replace: true });
    } catch {
      setErrors({ form: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Field label={`${label} name`} htmlFor="login-name" error={errors.name}>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-cobalt" />
          <Input
            id="login-name"
            autoComplete="name"
            placeholder={role === "student" ? "e.g. Riya Sharma" : "e.g. Dr. Ananya Rao"}
            value={name}
            maxLength={100}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((x) => ({ ...x, name: undefined, form: undefined }));
            }}
            aria-invalid={!!errors.name}
            className="pl-10"
          />
        </div>
      </Field>
      <Field
        label="Phone number"
        htmlFor="login-phone"
        error={errors.phone}
        hint="Kept private — never shown to anyone."
      >
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-cobalt" />
          <Input
            id="login-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit mobile number"
            value={phone}
            maxLength={20}
            onChange={(e) => {
              setPhone(e.target.value);
              setErrors((x) => ({ ...x, phone: undefined, form: undefined }));
            }}
            aria-invalid={!!errors.phone}
            className="pl-10"
          />
        </div>
      </Field>

      {errors.form && (
        <p role="alert" className="rounded-xl border border-absent/30 bg-absent-soft px-3.5 py-2.5 text-sm text-absent-foreground">
          {errors.form}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" /> : null}
        {submitting ? "Signing in…" : `Log in as ${label}`}
      </Button>
    </form>
  );
}
