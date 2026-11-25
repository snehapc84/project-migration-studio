import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical, Presentation } from "lucide-react";
import { useState } from "react";
import { LoginForm } from "@/components/lc/LoginForm";
import { LoginLayout } from "@/components/lc/LoginLayout";

const DEMO_ACCOUNTS = [
  { name: "Dr. Ananya Rao", dept: "Computer Science", phone: "9000000001" },
  { name: "Prof. Vikram Menon", dept: "Electronics & Comm.", phone: "9000000002" },
  { name: "Dr. Priya Shah", dept: "Mechanical", phone: "9000000003" },
  { name: "Mr. Arjun Nair", dept: "Civil", phone: "9000000004" },
  { name: "Dr. Kavitha Iyer", dept: "Electrical & Electronics", phone: "9000000005" },
  { name: "Ms. Sneha Kulkarni", dept: "Information Technology", phone: "9000000006" },
];

export const Route = createFileRoute("/login/lecturer")({
  head: () => ({
    meta: [
      { title: "Lecturer Login — Lecturer Connect" },
      { name: "description", content: "Log in as a lecturer to update your availability and manage your weekly timetable." },
      { property: "og:title", content: "Lecturer Login — Lecturer Connect" },
      { property: "og:description", content: "Update your availability and timetable so students know when to find you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LecturerLogin,
});

function LecturerLogin() {
  const [prefill, setPrefill] = useState<{ name: string; phone: string } | null>(null);

  return (
    <LoginLayout
      icon={<Presentation className="size-7" />}
      eyebrow="For lecturers"
      title="Lecturer Login"
      subtitle="Use the name and phone number registered with the college office."
      switchTo={{ to: "/login/student", label: "I'm a student" }}
      aside={
        <div className="rounded-3xl border border-butter-strong bg-butter p-6 shadow-soft">
          <div className="mb-1 flex items-center gap-2 text-navy">
            <FlaskConical className="size-5" />
            <h2 className="font-display text-xl font-semibold">Demo accounts</h2>
          </div>
          <p className="mb-4 text-sm text-navy/75">
            Fictional lecturers for trying the app. Tap one to fill the form — their sample details can be edited or
            replaced.
          </p>
          <ul className="space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.phone}>
                <button
                  type="button"
                  onClick={() => setPrefill({ name: a.name, phone: a.phone })}
                  className="flex w-full items-center justify-between gap-3 rounded-xl bg-card px-4 py-2.5 text-left text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>
                    <span className="block font-semibold text-navy">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{a.dept}</span>
                  </span>
                  <span className="font-mono text-xs text-navy/70">{a.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <LoginForm role="lecturer" prefill={prefill} />
      <p className="mt-5 text-center text-xs text-muted-foreground">
        Not on the list? Ask the college office to add your profile.
      </p>
    </LoginLayout>
  );
}
