import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Search, ShieldCheck, Signal } from "lucide-react";
import { LoginForm } from "@/components/lc/LoginForm";
import { LoginLayout } from "@/components/lc/LoginLayout";

export const Route = createFileRoute("/login/student")({
  head: () => ({
    meta: [
      { title: "Student Login — Lecturer Connect" },
      { name: "description", content: "Log in as a student to search lecturers, check availability and view timetables." },
      { property: "og:title", content: "Student Login — Lecturer Connect" },
      { property: "og:description", content: "Search lecturers and check their availability and weekly timetables." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentLogin,
});

function StudentLogin() {
  return (
    <LoginLayout
      icon={<GraduationCap className="size-7" />}
      eyebrow="For students"
      title="Student Login"
      subtitle="Enter your name and phone number. First time here? We'll create your student account automatically."
      switchTo={{ to: "/login/lecturer", label: "I'm a lecturer" }}
      aside={
        <div className="space-y-4">
          {[
            { icon: Search, title: "Search the directory", text: "Find lecturers by name or department." },
            { icon: Signal, title: "Live availability", text: "Status changes appear instantly — no refreshing." },
            { icon: ShieldCheck, title: "Private by design", text: "Phone numbers are used only for login and never displayed." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-border bg-card/80 p-5 shadow-soft">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-butter text-navy">
                <Icon className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-navy">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
          <p className="px-1 text-xs text-muted-foreground">
            Prototype sign-in uses name and phone. Secure college sign-in or OTP can be added later.
          </p>
        </div>
      }
    >
      <LoginForm role="student" />
    </LoginLayout>
  );
}
