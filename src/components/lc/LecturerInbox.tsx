import { useQuery } from "@tanstack/react-query";
import { Inbox, MessageCircle } from "lucide-react";
import { useState } from "react";
import { formatMessageTime, lecturerConversationsQuery } from "@/lib/messages";
import { ChatThread } from "./ChatThread";

export function LecturerInbox({ lecturerId }: { lecturerId: string }) {
  const { data: conversations = [], isLoading } = useQuery(lecturerConversationsQuery());
  const [selected, setSelected] = useState<string | null>(null);
  const active = conversations.find((c) => c.student_id === selected) ?? null;
  const totalUnread = conversations.reduce((n, c) => n + Number(c.unread), 0);

  return (
    <section id="messages" className="mt-10 scroll-mt-24">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cobalt">Messages / Inbox</p>
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-navy">
          Messages from students
          {totalUnread > 0 && (
            <span className="rounded-full bg-absent px-2.5 py-0.5 font-sans text-xs font-bold text-white">{totalUnread} unread</span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">Conversations are private between you and each student.</p>
      </div>
      <div className="grid gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <ul className="max-h-[480px] space-y-1 overflow-y-auto md:border-r md:border-border md:pr-3">
          {isLoading ? (
            <li className="px-3 py-6 text-sm text-muted-foreground">Loading…</li>
          ) : conversations.length === 0 ? (
            <li className="flex flex-col items-center px-3 py-10 text-center text-sm text-muted-foreground">
              <Inbox className="mb-2 size-8 text-cobalt" /> No messages yet. Students can message you from your profile.
            </li>
          ) : (
            conversations.map((c) => (
              <li key={c.student_id}>
                <button
                  type="button"
                  onClick={() => setSelected(c.student_id)}
                  className={
                    (c.student_id === selected ? "bg-secondary " : "hover:bg-muted ") +
                    "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-2 rounded-xl px-3 py-2.5 text-left transition-colors"
                  }
                >
                  <span className="truncate font-semibold text-navy">{c.student_name}</span>
                  {Number(c.unread) > 0 ? (
                    <span className="rounded-full bg-absent px-2 py-0.5 text-[11px] font-bold text-white">{c.unread}</span>
                  ) : (
                    <span />
                  )}
                  <span className="truncate text-xs text-muted-foreground">
                    {c.last_sender === "lecturer" ? "You: " : ""}
                    {c.last_body}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{formatMessageTime(c.last_at)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="flex h-[480px] min-w-0 flex-col">
          {active ? (
            <>
              <p className="border-b border-border pb-2 font-display text-lg font-semibold text-navy">{active.student_name}</p>
              <ChatThread key={active.student_id} lecturerId={lecturerId} studentId={active.student_id} viewer="lecturer" otherName={active.student_name} />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <MessageCircle className="mb-2 size-8 text-cobalt" /> Select a conversation to read and reply.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
