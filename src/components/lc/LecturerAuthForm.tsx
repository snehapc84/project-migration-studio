import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, Mail, UserRound } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { registerLecturer } from "@/lib/auth.functions";
import {
  lecturerAccountEmail,
  lecturerLoginSchema,
  lecturerRegisterSchema,
  namesMatch,
  parseIdentifier,
} from "@/lib/validation";
import { Field } from "./TimetableEntryDialog";

type Mode = "login" | "register" | "forgot";
type Errors = Partial<Record<"name" | "identifier" | "password" | "confirm" | "form", string | undefined>>;

export function LecturerAuthForm({ prefill }: { prefill?: { name: string; phone: string } | null | undefined }) {
  const navigate = useNavigate();
  const register = useServerFn(registerLecturer);
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [lastPrefill, setLastPrefill] = useState(prefill);
  if (prefill !== lastPrefill) {
    setLastPrefill(prefill);
    if (prefill) {
      setName(prefill.name);
      setIdentifier(prefill.phone);
      setMode("register");
      setErrors({});
      setNotice(null);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
    setNotice(null);
    setPassword("");
    setConfirm("");
  }

  function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]): Errors {
    const next: Errors = {};
    for (const issue of issues) {
      const key = issue.path[0] as keyof Errors;
      next[key] ??= issue.message;
    }
    return next;
  }

  /** Sign in, then make sure this is a lecturer account whose profile name matches. */
  async function signInAsLecturer(email: string, pass: string, typedName: string): Promise<string | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error || !data.user) return "Incorrect email/phone or password.";
    const [{ data: roles }, { data: lecturer }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      supabase.from("lecturers").select("name").eq("user_id", data.user.id).maybeSingle(),
    ]);
    const isLecturer = roles?.some((r) => r.role === "lecturer");
    if (!isLecturer || !lecturer) {
      await supabase.auth.signOut();
      return "This is not a lecturer account.";
    }
    if (!namesMatch(lecturer.name, typedName)) {
      await supabase.auth.signOut();
      return "The name doesn't match this lecturer account.";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);

    if (mode === "forgot") {
      const id = parseIdentifier(identifier);
      if (!id) return setErrors({ identifier: "Enter a valid email address or phone number." });
      if (id.kind === "phone") {
        return setErrors({
          form: "Password reset links are sent by email. Accounts registered with a phone number can't be reset online — please contact the college office.",
        });
      }
      setSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(id.value, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setSubmitting(false);
      if (error) return setErrors({ form: "Couldn't send the reset email. Please try again in a moment." });
      setErrors({});
      setNotice("If an account exists for this email, a password reset link is on its way.");
      return;
    }

    if (mode === "register") {
      const parsed = lecturerRegisterSchema.safeParse({ name, identifier, password });
      const next = parsed.success ? {} : issuesToErrors(parsed.error.issues);
      if (password !== confirm) next.confirm = "Passwords don't match.";
      if (!parsed.success || next.confirm) return setErrors(next);
      setSubmitting(true);
      setErrors({});
      try {
        const result = await register({ data: parsed.data });
        if (!result.ok) return setErrors({ form: result.error });
        const err = await signInAsLecturer(result.email, parsed.data.password, parsed.data.name);
        if (err) return setErrors({ form: err });
        navigate({ to: "/lecturer", replace: true });
      } catch {
        setErrors({ form: "Couldn't reach the server. Check your connection and try again." });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const parsed = lecturerLoginSchema.safeParse({ name, identifier, password });
    if (!parsed.success) return setErrors(issuesToErrors(parsed.error.issues));
    const id = parseIdentifier(parsed.data.identifier);
    if (!id) return setErrors({ identifier: "Enter a valid email address or phone number." });
    setSubmitting(true);
    setErrors({});
    try {
      const err = await signInAsLecturer(lecturerAccountEmail(id), parsed.data.password, parsed.data.name);
      if (err) return setErrors({ form: err });
      navigate({ to: "/lecturer", replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  const clear = (key: keyof Errors) => setErrors((x) => ({ ...x, [key]: undefined, form: undefined }));

  return (
    <div>
      {mode !== "forgot" && (
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="tablist">
          <TabButton active={mode === "login"} onClick={() => switchMode("login")}>Log in</TabButton>
          <TabButton active={mode === "register"} onClick={() => switchMode("register")}>Register</TabButton>
        </div>
      )}
      {mode === "forgot" && (
        <div className="mb-5">
          <h2 className="font-display text-xl font-semibold text-navy">Reset your password</h2>
          <p className="text-sm text-muted-foreground">Enter the email you registered with and we'll send you a reset link.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {mode !== "forgot" && (
          <Field label="Lecturer name" htmlFor="lec-name" error={errors.name}>
            <IconInput icon={<UserRound />}>
              <Input
                id="lec-name"
                autoComplete="name"
                placeholder="e.g. Dr. Ananya Rao"
                value={name}
                maxLength={100}
                onChange={(e) => {
                  setName(e.target.value);
                  clear("name");
                }}
                aria-invalid={!!errors.name}
                className="pl-10"
              />
            </IconInput>
          </Field>
        )}
        <Field
          label={mode === "login" ? "Registered email or phone number" : mode === "forgot" ? "Registered email" : "Email or phone number"}
          htmlFor="lec-id"
          error={errors.identifier}
          hint={mode === "register" ? "Kept private — never shown to students." : undefined}
        >
          <IconInput icon={<Mail />}>
            <Input
              id="lec-id"
              autoComplete="username"
              placeholder={mode === "forgot" ? "you@college.edu" : "you@college.edu or 10-digit number"}
              value={identifier}
              maxLength={254}
              onChange={(e) => {
                setIdentifier(e.target.value);
                clear("identifier");
              }}
              aria-invalid={!!errors.identifier}
              className="pl-10"
            />
          </IconInput>
        </Field>
        {mode !== "forgot" && (
          <Field
            label={mode === "register" ? "Create password" : "Password"}
            htmlFor="lec-pass"
            error={errors.password}
            hint={mode === "register" ? "At least 8 characters." : undefined}
          >
            <IconInput icon={<KeyRound />}>
              <Input
                id="lec-pass"
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={password}
                maxLength={72}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clear("password");
                }}
                aria-invalid={!!errors.password}
                className="pl-10"
              />
            </IconInput>
          </Field>
        )}
        {mode === "register" && (
          <Field label="Confirm password" htmlFor="lec-confirm" error={errors.confirm}>
            <IconInput icon={<KeyRound />}>
              <Input
                id="lec-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                maxLength={72}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  clear("confirm");
                }}
                aria-invalid={!!errors.confirm}
                className="pl-10"
              />
            </IconInput>
          </Field>
        )}

        {mode === "login" && (
          <div className="-mt-2 text-right">
            <button type="button" onClick={() => switchMode("forgot")} className="text-sm font-medium text-cobalt hover:underline">
              Forgot password?
            </button>
          </div>
        )}

        {errors.form && (
          <p role="alert" className="rounded-xl border border-absent/30 bg-absent-soft px-3.5 py-2.5 text-sm text-absent-foreground">
            {errors.form}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl border border-available/30 bg-available-soft px-3.5 py-2.5 text-sm text-navy">
            {notice}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : null}
          {mode === "login"
            ? submitting ? "Signing in…" : "Log in as Lecturer"
            : mode === "register"
              ? submitting ? "Creating account…" : "Create lecturer account"
              : submitting ? "Sending…" : "Send reset link"}
        </Button>
        {mode === "forgot" && (
          <button type="button" onClick={() => switchMode("login")} className="block w-full text-center text-sm font-medium text-cobalt hover:underline">
            Back to log in
          </button>
        )}
      </form>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-card px-4 py-2 text-sm font-semibold text-navy shadow-sm"
          : "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-navy"
      }
    >
      {children}
    </button>
  );
}

function IconInput({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cobalt [&_svg]:size-4">{icon}</span>
      {children}
    </div>
  );
}
