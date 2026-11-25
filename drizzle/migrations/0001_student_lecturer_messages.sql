CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecturer_id uuid NOT NULL REFERENCES public.lecturers(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  sender text NOT NULL CHECK (sender IN ('student', 'lecturer')),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX messages_thread_idx ON public.messages (lecturer_id, student_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_lecturer(_lecturer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.lecturers WHERE id = _lecturer_id AND user_id = auth.uid())
    AND public.has_role(auth.uid(), 'lecturer')
$$;

CREATE OR REPLACE FUNCTION public.student_has_messaged(_lecturer_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.messages WHERE lecturer_id = _lecturer_id AND student_id = _student_id AND sender = 'student')
$$;

CREATE POLICY "Participants read their messages" ON public.messages
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.owns_lecturer(lecturer_id));
CREATE POLICY "Students send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender = 'student' AND student_id = auth.uid() AND read_at IS NULL
    AND public.has_role(auth.uid(), 'student'));
CREATE POLICY "Lecturers reply to their students" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender = 'lecturer' AND read_at IS NULL AND public.owns_lecturer(lecturer_id)
    AND public.student_has_messaged(lecturer_id, student_id));
CREATE POLICY "Recipients mark messages read" ON public.messages
  FOR UPDATE TO authenticated
  USING ((sender = 'lecturer' AND student_id = auth.uid()) OR (sender = 'student' AND public.owns_lecturer(lecturer_id)))
  WITH CHECK ((sender = 'lecturer' AND student_id = auth.uid()) OR (sender = 'student' AND public.owns_lecturer(lecturer_id)));

CREATE OR REPLACE FUNCTION public.lecturer_conversations()
RETURNS TABLE (student_id uuid, student_name text, last_body text, last_sender text, last_at timestamptz, unread bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.student_id,
         COALESCE(s.name, 'Student') AS student_name,
         (array_agg(m.body ORDER BY m.created_at DESC))[1],
         (array_agg(m.sender ORDER BY m.created_at DESC))[1],
         max(m.created_at),
         count(*) FILTER (WHERE m.sender = 'student' AND m.read_at IS NULL)
  FROM public.messages m
  JOIN public.lecturers l ON l.id = m.lecturer_id AND l.user_id = auth.uid()
  LEFT JOIN public.students s ON s.user_id = m.student_id
  WHERE public.has_role(auth.uid(), 'lecturer')
  GROUP BY m.student_id, s.name
  ORDER BY max(m.created_at) DESC
$$;
REVOKE EXECUTE ON FUNCTION public.lecturer_conversations() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.lecturer_conversations() TO authenticated;