import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Lecturer = Database["public"]["Tables"]["lecturers"]["Row"];

const LECTURER_COLUMNS =
  "id, user_id, name, department, designation, status, status_until, status_note, status_updated_at, timetable_updated_at, is_demo, created_at, updated_at";

export const lecturersQuery = () =>
  queryOptions({
    queryKey: ["lecturers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lecturers").select(LECTURER_COLUMNS).order("name");
      if (error) throw error;
      return data as Lecturer[];
    },
  });

export const lecturerQuery = (id: string) =>
  queryOptions({
    queryKey: ["lecturers", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lecturers").select(LECTURER_COLUMNS).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Lecturer | null;
    },
  });

export const myLecturerQuery = (userId: string) =>
  queryOptions({
    queryKey: ["lecturers", "mine", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lecturers").select(LECTURER_COLUMNS).eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data as Lecturer | null;
    },
  });

export const timetableQuery = (lecturerId: string) =>
  queryOptions({
    queryKey: ["timetable", lecturerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_entries")
        .select("id, lecturer_id, day_of_week, start_time, end_time, subject, room")
        .eq("lecturer_id", lecturerId)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

export const myStudentQuery = (userId: string) =>
  queryOptions({
    queryKey: ["student", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("user_id, name").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

/** Keep every screen in sync with lecturer and timetable changes as they happen. */
export function useLiveUpdates() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lecturers" }, () => {
        queryClient.invalidateQueries({ queryKey: ["lecturers"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "timetable_entries" }, () => {
        queryClient.invalidateQueries({ queryKey: ["timetable"] });
        queryClient.invalidateQueries({ queryKey: ["lecturers"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/** Current time, refreshed every 30 seconds so "until" times and "x min ago" stay accurate. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
