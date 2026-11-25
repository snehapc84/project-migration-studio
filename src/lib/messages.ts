import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Message = {
  id: string;
  lecturer_id: string;
  student_id: string;
  sender: "student" | "lecturer";
  body: string;
  created_at: string;
  read_at: string | null;
};

/** New messages show up within a few seconds without a reload. */
export const MESSAGE_POLL_MS = 4000;

export const threadQuery = (lecturerId: string, studentId: string) =>
  queryOptions({
    queryKey: ["messages", "thread", lecturerId, studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, lecturer_id, student_id, sender, body, created_at, read_at")
        .eq("lecturer_id", lecturerId)
        .eq("student_id", studentId)
        .order("created_at");
      if (error) throw error;
      return data as Message[];
    },
    refetchInterval: MESSAGE_POLL_MS,
  });

export const lecturerConversationsQuery = () =>
  queryOptions({
    queryKey: ["messages", "conversations"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("lecturer_conversations");
      if (error) throw error;
      return data;
    },
    refetchInterval: MESSAGE_POLL_MS,
  });

/** Unread lecturer replies for the signed-in student, grouped by lecturer. */
export const studentUnreadQuery = (studentId: string) =>
  queryOptions({
    queryKey: ["messages", "student-unread", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("lecturer_id")
        .eq("student_id", studentId)
        .eq("sender", "lecturer")
        .is("read_at", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data) counts[row.lecturer_id] = (counts[row.lecturer_id] ?? 0) + 1;
      return counts;
    },
    refetchInterval: MESSAGE_POLL_MS,
  });

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
