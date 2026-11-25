CREATE TYPE public.app_role AS ENUM ('student', 'lecturer');
CREATE TYPE public.availability_status AS ENUM ('available', 'busy', 'absent');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.lecturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  department text NOT NULL CHECK (char_length(department) BETWEEN 2 AND 100),
  designation text NOT NULL CHECK (char_length(designation) BETWEEN 2 AND 100),
  status public.availability_status NOT NULL DEFAULT 'available',
  status_until timestamptz,
  status_note text CHECK (status_note IS NULL OR char_length(status_note) <= 140),
  status_updated_at timestamptz NOT NULL DEFAULT now(),
  timetable_updated_at timestamptz NOT NULL DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lecturers TO authenticated;
GRANT UPDATE (name, department, designation, status, status_until, status_note) ON public.lecturers TO authenticated;
GRANT ALL ON public.lecturers TO service_role;
ALTER TABLE public.lecturers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students and lecturers can view lecturers" ON public.lecturers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'student') OR public.has_role(auth.uid(), 'lecturer'));
CREATE POLICY "Lecturers update own profile" ON public.lecturers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'lecturer'))
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.lecturers_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.status_until IS DISTINCT FROM OLD.status_until
     OR NEW.status_note IS DISTINCT FROM OLD.status_note THEN
    NEW.status_updated_at := now();
  END IF;
  IF NEW.status = 'absent' THEN
    NEW.status_until := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER lecturers_touch BEFORE UPDATE ON public.lecturers
  FOR EACH ROW EXECUTE FUNCTION public.lecturers_touch();

CREATE TABLE public.lecturer_contacts (
  lecturer_id uuid PRIMARY KEY REFERENCES public.lecturers(id) ON DELETE CASCADE,
  phone text NOT NULL UNIQUE CHECK (phone ~ '^[0-9]{10,15}$')
);
GRANT ALL ON public.lecturer_contacts TO service_role;
ALTER TABLE public.lecturer_contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.students (
  user_id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  phone text NOT NULL UNIQUE CHECK (phone ~ '^[0-9]{10,15}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own record" ON public.students
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.timetable_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecturer_id uuid NOT NULL REFERENCES public.lecturers(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 120),
  room text NOT NULL CHECK (char_length(room) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX timetable_entries_lecturer_idx ON public.timetable_entries (lecturer_id, day_of_week, start_time);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_entries TO authenticated;
GRANT ALL ON public.timetable_entries TO service_role;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students and lecturers can view timetables" ON public.timetable_entries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'student') OR public.has_role(auth.uid(), 'lecturer'));
CREATE POLICY "Lecturers add own entries" ON public.timetable_entries
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.lecturers l WHERE l.id = lecturer_id AND l.user_id = auth.uid()));
CREATE POLICY "Lecturers edit own entries" ON public.timetable_entries
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lecturers l WHERE l.id = lecturer_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lecturers l WHERE l.id = lecturer_id AND l.user_id = auth.uid()));
CREATE POLICY "Lecturers delete own entries" ON public.timetable_entries
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lecturers l WHERE l.id = lecturer_id AND l.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.timetable_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF EXISTS (
    SELECT 1 FROM public.timetable_entries t
    WHERE t.lecturer_id = NEW.lecturer_id
      AND t.day_of_week = NEW.day_of_week
      AND t.id <> NEW.id
      AND t.start_time < NEW.end_time
      AND NEW.start_time < t.end_time
  ) THEN
    RAISE EXCEPTION 'This time overlaps with another class on the same day.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER timetable_validate BEFORE INSERT OR UPDATE ON public.timetable_entries
  FOR EACH ROW EXECUTE FUNCTION public.timetable_validate();

CREATE OR REPLACE FUNCTION public.timetable_touch_lecturer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.lecturers SET timetable_updated_at = now()
  WHERE id = COALESCE(NEW.lecturer_id, OLD.lecturer_id);
  RETURN NULL;
END $$;
CREATE TRIGGER timetable_touch_lecturer AFTER INSERT OR UPDATE OR DELETE ON public.timetable_entries
  FOR EACH ROW EXECUTE FUNCTION public.timetable_touch_lecturer();

ALTER TABLE public.lecturers REPLICA IDENTITY FULL;
ALTER TABLE public.timetable_entries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lecturers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable_entries;