import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatMessageTime, threadQuery } from "@/lib/messages";

export function ChatThread({
  lecturerId,
  studentId,
  viewer,
  otherName,
}: {
  lecturerId: string;
  studentId: string;
  viewer: "student" | "lecturer";
  otherName: string;
}) {
  const queryClient = useQueryClient();
  const { data: messages = [], isLoading } = useQuery(threadQuery(lecturerId, studentId));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const unreadIds = messages.filter((m) => m.sender !== viewer && !m.read_at).map((m) => m.id);
  const unreadKey = unreadIds.join(",");

  useEffect(() => {
    if (!unreadKey) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadKey.split(","))
      .then(() => queryClient.invalidateQueries({ queryKey: ["messages"] }));
  }, [unreadKey, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ lecturer_id: lecturerId, student_id: studentId, sender: viewer, body });
    setSending(false);
    if (error) {
      toast.error("Couldn't send your message. Please try again.");
      return;
    }
    setText("");
    await queryClient.invalidateQueries({ queryKey: ["messages"] });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-2">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {viewer === "student" ? `Start the conversation with ${otherName}.` : "No messages yet."}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender === viewer;
            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    mine
                      ? "max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground shadow-sm"
                      : "max-w-[80%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-navy shadow-sm"
                  }
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                  <p className={mine ? "mt-1 text-[11px] text-primary-foreground/70" : "mt-1 text-[11px] text-muted-foreground"}>
                    {mine ? "You" : otherName} · {formatMessageTime(m.created_at)}
                    {mine && m.read_at ? " · Read" : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="mt-3 flex items-end gap-2 border-t border-border pt-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          maxLength={2000}
          rows={2}
          placeholder={viewer === "student" ? `Message ${otherName}…` : `Reply to ${otherName}…`}
          aria-label="Message"
          className="min-h-[44px] resize-none"
        />
        <Button type="submit" disabled={sending || !text.trim()} aria-label="Send message">
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
    </div>
  );
}
