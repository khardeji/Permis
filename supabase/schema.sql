-- ============================================================================
-- PermiConduit — Schéma complet pour Supabase externe
-- Projet cible : mpqdatzadwkapjfgjzkq (https://mpqdatzadwkapjfgjzkq.supabase.co)
-- Exécuter ce script dans : Supabase Dashboard -> SQL Editor -> New query
-- ============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enum des rôles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'instructor', 'student');
  END IF;
END $$;

-- 3. Tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  city text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  city text NOT NULL DEFAULT '',
  address text,
  phone text,
  whatsapp text,
  email text,
  short_bio text,
  bio text,
  avatar_url text,
  cover_url text,
  experience_years integer,
  price_per_hour numeric,
  rating numeric NOT NULL DEFAULT 0,
  services text[] NOT NULL DEFAULT '{}',
  availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  accepting_students boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  city text,
  license_type text NOT NULL DEFAULT 'B',
  agreed_price numeric NOT NULL DEFAULT 0,
  hours_package integer NOT NULL DEFAULT 20,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.instructor_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instructor_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.enrollment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  email text,
  city text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text NOT NULL DEFAULT 'cash',
  note text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid REFERENCES public.instructors(id) ON DELETE SET NULL,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Index de performance
CREATE INDEX IF NOT EXISTS idx_instructors_status_city ON public.instructors(status, city);
CREATE INDEX IF NOT EXISTS idx_galleries_instructor ON public.galleries(instructor_id, position);
CREATE INDEX IF NOT EXISTS idx_students_instructor ON public.students(instructor_id);
CREATE INDEX IF NOT EXISTS idx_students_user ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_instructor_starts ON public.lessons(instructor_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_lessons_student ON public.lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_instructor ON public.payments(instructor_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_instructor ON public.enrollment_requests(instructor_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_student ON public.enrollment_requests(student_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- 5. Fonctions utilitaires & RPC
CREATE OR REPLACE FUNCTION public.slugify(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' FROM regexp_replace(lower(coalesce(_txt, '')), '[^a-z0-9]+', '-', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.unique_instructor_slug(_base text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text := nullif(public.slugify(_base), '');
  candidate text;
  suffix int := 1;
BEGIN
  IF base_slug IS NULL THEN
    base_slug := 'moniteur';
  END IF;
  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.instructors WHERE slug = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.my_instructor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.instructors WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_my_instructor(_instructor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = _instructor_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.my_student_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(id), '{}')
  FROM public.students
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.owns_student(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.instructors i ON i.id = s.instructor_id
    WHERE s.id = _student_id AND i.user_id = auth.uid()
  );
$$;

-- Accepter ou refuser une demande d'inscription (RPC appelée par /pro/demandes)
CREATE OR REPLACE FUNCTION public.decide_enrollment(
  _request_id uuid,
  _accept boolean,
  _agreed_price numeric DEFAULT 1200,
  _hours integer DEFAULT 20
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.enrollment_requests%ROWTYPE;
  new_student_id uuid;
  instr_name text;
BEGIN
  SELECT * INTO req FROM public.enrollment_requests WHERE id = _request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande introuvable';
  END IF;

  IF NOT (public.is_my_instructor(req.instructor_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'Cette demande a déjà été traitée';
  END IF;

  SELECT first_name || ' ' || last_name INTO instr_name
  FROM public.instructors WHERE id = req.instructor_id;

  IF _accept THEN
    INSERT INTO public.students (
      instructor_id, user_id, full_name, phone, email, city,
      agreed_price, hours_package, status
    )
    VALUES (
      req.instructor_id, req.student_user_id, req.full_name, req.phone, req.email, req.city,
      coalesce(_agreed_price, 1200), coalesce(_hours, 20), 'active'
    )
    RETURNING id INTO new_student_id;

    INSERT INTO public.instructor_students (instructor_id, student_id, student_user_id)
    VALUES (req.instructor_id, new_student_id, req.student_user_id)
    ON CONFLICT (instructor_id, student_id) DO NOTHING;

    UPDATE public.enrollment_requests
    SET status = 'accepted', decided_at = now()
    WHERE id = _request_id;

    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      req.student_user_id,
      'Demande acceptée',
      coalesce(instr_name, 'Votre moniteur') || ' a accepté votre demande d''inscription.',
      '/eleve'
    );

    RETURN new_student_id;
  ELSE
    UPDATE public.enrollment_requests
    SET status = 'rejected', decided_at = now()
    WHERE id = _request_id;

    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      req.student_user_id,
      'Demande refusée',
      coalesce(instr_name, 'Le moniteur') || ' n''a pas pu accepter votre demande.',
      '/moniteurs'
    );

    RETURN NULL;
  END IF;
END;
$$;

-- Charger des données de démo dans l'espace moniteur (RPC appelée par /pro)
CREATE OR REPLACE FUNCTION public.seed_my_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  iid uuid := public.my_instructor_id();
  s1 uuid;
  s2 uuid;
BEGIN
  IF iid IS NULL THEN
    RAISE EXCEPTION 'Profil moniteur introuvable';
  END IF;

  INSERT INTO public.students (instructor_id, full_name, phone, city, license_type, agreed_price, hours_package, status)
  VALUES (iid, 'Youssef Ben Ali', '+216 22 111 222', 'Tunis', 'B', 1200, 20, 'active')
  RETURNING id INTO s1;

  INSERT INTO public.students (instructor_id, full_name, phone, city, license_type, agreed_price, hours_package, status)
  VALUES (iid, 'Amira Trabelsi', '+216 55 333 444', 'Ariana', 'B', 1350, 25, 'active')
  RETURNING id INTO s2;

  INSERT INTO public.lessons (instructor_id, student_id, starts_at, ends_at, location, status)
  VALUES
    (iid, s1, now() + interval '1 day', now() + interval '1 day 1 hour', 'Centre-ville Tunis', 'scheduled'),
    (iid, s2, now() + interval '2 days', now() + interval '2 days 90 minutes', 'Les Berges du Lac', 'scheduled'),
    (iid, s1, now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 'El Menzah', 'completed');

  INSERT INTO public.payments (instructor_id, student_id, amount, method, note, paid_at)
  VALUES
    (iid, s1, 400, 'cash', 'Acompte inscription', now() - interval '3 days'),
    (iid, s2, 500, 'transfer', 'Premier versement', now() - interval '1 day');
END;
$$;

-- 6. Trigger création automatique profil + rôle + moniteur/demande à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  v_full_name text := trim(coalesce(meta->>'full_name', split_part(coalesce(NEW.email, ''), '@', 1), 'Utilisateur'));
  v_phone text := nullif(trim(coalesce(meta->>'phone', '')), '');
  v_city text := nullif(trim(coalesce(meta->>'city', '')), '');
  v_account_type text := coalesce(meta->>'account_type', 'student');
  v_desired_raw text := nullif(trim(coalesce(meta->>'desired_instructor_id', '')), '');
  v_desired_id uuid;
  v_first text;
  v_last text;
  v_instr_user_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, city)
  VALUES (NEW.id, v_full_name, NEW.email, v_phone, v_city)
  ON CONFLICT (id) DO NOTHING;

  IF v_account_type = 'instructor' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'instructor')
    ON CONFLICT (user_id, role) DO NOTHING;

    v_first := split_part(v_full_name, ' ', 1);
    v_last := nullif(trim(substring(v_full_name FROM length(v_first) + 1)), '');
    IF v_last IS NULL THEN
      v_last := v_first;
    END IF;

    INSERT INTO public.instructors (user_id, first_name, last_name, slug, city, phone, email, status)
    VALUES (
      NEW.id,
      v_first,
      v_last,
      public.unique_instructor_slug(v_full_name),
      coalesce(v_city, 'Tunis'),
      v_phone,
      NEW.email,
      'pending'
    )
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;

    IF v_desired_raw IS NOT NULL AND v_desired_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_desired_id := v_desired_raw::uuid;
      SELECT user_id INTO v_instr_user_id FROM public.instructors WHERE id = v_desired_id;
      IF FOUND THEN
        INSERT INTO public.enrollment_requests (instructor_id, student_user_id, full_name, phone, email, city)
        VALUES (v_desired_id, NEW.id, v_full_name, v_phone, NEW.email, v_city);

        IF v_instr_user_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, title, body, link)
          VALUES (v_instr_user_id, 'Nouvelle demande d''inscription', v_full_name || ' souhaite apprendre avec vous.', '/pro/demandes');
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Activation RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- 8. Politiques RLS
-- profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- instructors (annuaire public pour les moniteurs actifs)
DROP POLICY IF EXISTS "instructors_public_read_active" ON public.instructors;
CREATE POLICY "instructors_public_read_active" ON public.instructors
  FOR SELECT USING (
    status = 'active'
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "instructors_update_own_or_admin" ON public.instructors;
CREATE POLICY "instructors_update_own_or_admin" ON public.instructors
  FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "instructors_admin_all" ON public.instructors;
CREATE POLICY "instructors_admin_all" ON public.instructors
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- galleries
DROP POLICY IF EXISTS "galleries_public_read" ON public.galleries;
CREATE POLICY "galleries_public_read" ON public.galleries
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "galleries_manage_own_or_admin" ON public.galleries;
CREATE POLICY "galleries_manage_own_or_admin" ON public.galleries
  FOR ALL USING (public.is_my_instructor(instructor_id) OR public.has_role(auth.uid(), 'admin'));

-- students
DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select" ON public.students
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_my_instructor(instructor_id)
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "students_manage_instructor_or_admin" ON public.students;
CREATE POLICY "students_manage_instructor_or_admin" ON public.students
  FOR ALL USING (
    public.is_my_instructor(instructor_id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- instructor_students
DROP POLICY IF EXISTS "instructor_students_select" ON public.instructor_students;
CREATE POLICY "instructor_students_select" ON public.instructor_students
  FOR SELECT USING (
    student_user_id = auth.uid()
    OR public.is_my_instructor(instructor_id)
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "instructor_students_manage" ON public.instructor_students;
CREATE POLICY "instructor_students_manage" ON public.instructor_students
  FOR ALL USING (
    public.is_my_instructor(instructor_id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- enrollment_requests
DROP POLICY IF EXISTS "enrollment_requests_select" ON public.enrollment_requests;
CREATE POLICY "enrollment_requests_select" ON public.enrollment_requests
  FOR SELECT USING (
    student_user_id = auth.uid()
    OR public.is_my_instructor(instructor_id)
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "enrollment_requests_insert_student" ON public.enrollment_requests;
CREATE POLICY "enrollment_requests_insert_student" ON public.enrollment_requests
  FOR INSERT WITH CHECK (student_user_id = auth.uid());

DROP POLICY IF EXISTS "enrollment_requests_update" ON public.enrollment_requests;
CREATE POLICY "enrollment_requests_update" ON public.enrollment_requests
  FOR UPDATE USING (
    public.is_my_instructor(instructor_id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- lessons
DROP POLICY IF EXISTS "lessons_select" ON public.lessons;
CREATE POLICY "lessons_select" ON public.lessons
  FOR SELECT USING (
    student_id = ANY(public.my_student_ids())
    OR public.is_my_instructor(instructor_id)
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "lessons_manage_instructor_or_admin" ON public.lessons;
CREATE POLICY "lessons_manage_instructor_or_admin" ON public.lessons
  FOR ALL USING (
    public.is_my_instructor(instructor_id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- payments
DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (
    student_id = ANY(public.my_student_ids())
    OR public.is_my_instructor(instructor_id)
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "payments_manage_instructor_or_admin" ON public.payments;
CREATE POLICY "payments_manage_instructor_or_admin" ON public.payments
  FOR ALL USING (
    public.is_my_instructor(instructor_id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- reports
DROP POLICY IF EXISTS "reports_insert_authenticated" ON public.reports;
CREATE POLICY "reports_insert_authenticated" ON public.reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "reports_select_own_or_admin" ON public.reports;
CREATE POLICY "reports_select_own_or_admin" ON public.reports
  FOR SELECT USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "reports_admin_update" ON public.reports;
CREATE POLICY "reports_admin_update" ON public.reports
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- contact_messages (formulaire public)
DROP POLICY IF EXISTS "contact_messages_public_insert" ON public.contact_messages;
CREATE POLICY "contact_messages_public_insert" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "contact_messages_admin_select" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_select" ON public.contact_messages
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 9. Bucket Storage pour les photos des moniteurs
INSERT INTO storage.buckets (id, name, public)
VALUES ('instructor-media', 'instructor-media', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "instructor_media_upload_own" ON storage.objects;
CREATE POLICY "instructor_media_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'instructor-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "instructor_media_update_own" ON storage.objects;
CREATE POLICY "instructor_media_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'instructor-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "instructor_media_delete_own" ON storage.objects;
CREATE POLICY "instructor_media_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'instructor-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "instructor_media_read_own_or_admin" ON storage.objects;
CREATE POLICY "instructor_media_read_own_or_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'instructor-media'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
  );

-- 10. Avis sur le site (site_reviews) et avis sur les moniteurs (instructor_reviews)
CREATE TABLE IF NOT EXISTS public.site_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT 'Élève',
  city text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.instructor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instructor_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS idx_site_reviews_created ON public.site_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instructor_reviews_instructor ON public.instructor_reviews(instructor_id, created_at DESC);

-- Vérifie si l'utilisateur connecté est élève d'un moniteur donné
CREATE OR REPLACE FUNCTION public.is_student_of(_instructor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students
    WHERE instructor_id = _instructor_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.instructor_students
    WHERE instructor_id = _instructor_id AND student_user_id = auth.uid()
  );
$$;

-- Recalcule automatiquement la note moyenne d'un moniteur
CREATE OR REPLACE FUNCTION public.recalculate_instructor_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instructor_id uuid := COALESCE(NEW.instructor_id, OLD.instructor_id);
BEGIN
  UPDATE public.instructors
  SET rating = COALESCE(
    (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.instructor_reviews WHERE instructor_id = v_instructor_id),
    0
  )
  WHERE id = v_instructor_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_instructor_review_changed ON public.instructor_reviews;
CREATE TRIGGER on_instructor_review_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.instructor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_instructor_rating();

-- Statistiques publiques dynamiques (sans exposer les données privées)
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH all_ratings AS (
    SELECT rating FROM public.site_reviews
    UNION ALL
    SELECT rating FROM public.instructor_reviews
  )
  SELECT jsonb_build_object(
    'instructors_count', (SELECT count(*) FROM public.instructors WHERE status = 'active'),
    'students_count', (SELECT count(*) FROM public.students),
    'cities_count', (SELECT count(DISTINCT nullif(trim(city), '')) FROM public.instructors WHERE status = 'active'),
    'reviews_count', (SELECT count(*) FROM all_ratings),
    'avg_rating', (SELECT ROUND(AVG(rating)::numeric, 1) FROM all_ratings)
  );
$$;

-- RLS pour site_reviews & instructor_reviews
ALTER TABLE public.site_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_reviews_public_read" ON public.site_reviews;
CREATE POLICY "site_reviews_public_read" ON public.site_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_reviews_insert_own" ON public.site_reviews;
CREATE POLICY "site_reviews_insert_own" ON public.site_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "site_reviews_update_own_or_admin" ON public.site_reviews;
CREATE POLICY "site_reviews_update_own_or_admin" ON public.site_reviews
  FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "site_reviews_delete_own_or_admin" ON public.site_reviews;
CREATE POLICY "site_reviews_delete_own_or_admin" ON public.site_reviews
  FOR DELETE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "instructor_reviews_public_read" ON public.instructor_reviews;
CREATE POLICY "instructor_reviews_public_read" ON public.instructor_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "instructor_reviews_insert_student" ON public.instructor_reviews;
CREATE POLICY "instructor_reviews_insert_student" ON public.instructor_reviews
  FOR INSERT WITH CHECK (
    student_user_id = auth.uid()
    AND public.is_student_of(instructor_id)
  );

DROP POLICY IF EXISTS "instructor_reviews_update_student" ON public.instructor_reviews;
CREATE POLICY "instructor_reviews_update_student" ON public.instructor_reviews
  FOR UPDATE USING (
    student_user_id = auth.uid()
    AND public.is_student_of(instructor_id)
  ) WITH CHECK (
    student_user_id = auth.uid()
    AND public.is_student_of(instructor_id)
  );

DROP POLICY IF EXISTS "instructor_reviews_delete_own_or_admin" ON public.instructor_reviews;
CREATE POLICY "instructor_reviews_delete_own_or_admin" ON public.instructor_reviews
  FOR DELETE USING (
    student_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- 11. Privilèges SQL pour les rôles anon et authenticated (requis en plus des politiques RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.instructors, public.galleries, public.site_reviews, public.instructor_reviews TO anon;
GRANT INSERT ON public.contact_messages TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
