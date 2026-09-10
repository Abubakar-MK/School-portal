-- ============================================================
-- HIGHER GROUND COLLEGE OF HEALTH AND MANAGEMENT SCIENCES TAKUM
-- Student Result Management Portal — Database Schema (PostgreSQL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- ENUMS ----------
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'student');
CREATE TYPE student_status AS ENUM ('active', 'graduated', 'suspended', 'withdrawn', 'inactive');
CREATE TYPE result_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'published');
CREATE TYPE semester_name AS ENUM ('First Semester', 'Second Semester');

-- ---------- CORE USERS (auth identity for ALL roles) ----------
-- Every login (super admin, admin, student) resolves to one row here.
-- This is the single source of truth an auth middleware checks against.
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role            user_role NOT NULL,
  username        VARCHAR(100) UNIQUE, -- used by super_admin / admin
  password_hash   VARCHAR(255) NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- ACADEMIC STRUCTURE ----------
CREATE TABLE faculties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(150) NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id  UUID NOT NULL REFERENCES faculties(id) ON DELETE RESTRICT,
  name        VARCHAR(150) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (faculty_id, name)
);

CREATE TABLE programmes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  name          VARCHAR(150) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, name)
);

CREATE TABLE levels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL UNIQUE, -- e.g. ND I, ND II, HND I, HND II
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE academic_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(20) NOT NULL UNIQUE, -- e.g. 2025/2026
  is_current  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE semesters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  name        semester_name NOT NULL,
  is_current  BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (session_id, name)
);

-- ---------- GRADING CONFIG (super admin configurable) ----------
CREATE TABLE grading_scale (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade         VARCHAR(2) NOT NULL UNIQUE, -- A, B, C, D, E, F
  min_score     NUMERIC(5,2) NOT NULL,
  max_score     NUMERIC(5,2) NOT NULL,
  grade_point   NUMERIC(3,2) NOT NULL,
  remark        VARCHAR(30) NOT NULL
);

-- ---------- ADMINS ----------
CREATE TABLE admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name   VARCHAR(150) NOT NULL,
  email       VARCHAR(150),
  phone       VARCHAR(20),
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- STUDENTS ----------
-- The student's user_id row is what auth middleware uses to enforce
-- "a student can only ever act as themselves" — see middleware/auth.js.
CREATE TABLE students (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  matric_number         VARCHAR(50) NOT NULL UNIQUE,
  first_name            VARCHAR(100) NOT NULL,
  middle_name           VARCHAR(100),
  last_name             VARCHAR(100) NOT NULL,
  gender                VARCHAR(10),
  date_of_birth         DATE,
  phone                 VARCHAR(20) NOT NULL,
  email                 VARCHAR(150),
  faculty_id            UUID NOT NULL REFERENCES faculties(id),
  department_id         UUID NOT NULL REFERENCES departments(id),
  programme_id          UUID NOT NULL REFERENCES programmes(id),
  level_id              UUID NOT NULL REFERENCES levels(id),
  admission_session_id  UUID NOT NULL REFERENCES academic_sessions(id),
  admission_year        INT,
  photo_url             VARCHAR(500),
  status                student_status NOT NULL DEFAULT 'active',
  registered_by         UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_matric ON students(matric_number);
CREATE INDEX idx_students_dept ON students(department_id);
CREATE INDEX idx_students_programme ON students(programme_id);

-- ---------- COURSES ----------
CREATE TABLE courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(20) NOT NULL,
  title         VARCHAR(200) NOT NULL,
  credit_unit   INT NOT NULL CHECK (credit_unit > 0),
  department_id UUID NOT NULL REFERENCES departments(id),
  programme_id  UUID NOT NULL REFERENCES programmes(id),
  level_id      UUID NOT NULL REFERENCES levels(id),
  semester      semester_name NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, programme_id, level_id, semester)
);

-- ---------- RESULTS (one header per student/session/semester) ----------
CREATE TABLE results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id        UUID NOT NULL REFERENCES academic_sessions(id),
  semester_id       UUID NOT NULL REFERENCES semesters(id),
  level_id          UUID NOT NULL REFERENCES levels(id),
  status            result_status NOT NULL DEFAULT 'draft',
  total_credit_units INT NOT NULL DEFAULT 0,
  total_quality_points NUMERIC(8,2) NOT NULL DEFAULT 0,
  gpa               NUMERIC(4,2) NOT NULL DEFAULT 0,
  cgpa              NUMERIC(4,2) NOT NULL DEFAULT 0,
  academic_standing VARCHAR(50),
  submitted_by      UUID REFERENCES users(id),
  submitted_at      TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  published_at      TIMESTAMPTZ,
  -- Whether the student may currently VIEW this published result. Set
  -- automatically once a payment for it is verified successful, or
  -- manually by a Super Admin (e.g. to fix a payment problem). Has no
  -- meaning before the result is published — there is nothing to pay
  -- to view yet.
  access_granted    BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, session_id, semester_id)
);

CREATE INDEX idx_results_student ON results(student_id);
CREATE INDEX idx_results_status ON results(status);

-- ---------- RESULT ENTRIES (one row per course within a result) ----------
CREATE TABLE result_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id     UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  course_id     UUID NOT NULL REFERENCES courses(id),
  ca_score      NUMERIC(5,2) NOT NULL DEFAULT 0,
  exam_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade         VARCHAR(2),
  grade_point   NUMERIC(3,2),
  quality_point NUMERIC(6,2),
  remark        VARCHAR(30),
  UNIQUE (result_id, course_id)
);

-- ---------- RESULT VIEWING PAYMENTS ----------
-- Every payment attempt a student makes to unlock viewing one specific
-- published result. Multiple rows per result are normal (a failed
-- attempt followed by a successful retry) — this is a history log,
-- not a single record; the actual "can they view it" flag lives on
-- results.access_granted.
CREATE TABLE payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id     UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reference     VARCHAR(100) UNIQUE NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, success, failed
  gateway       VARCHAR(20) NOT NULL DEFAULT 'flutterwave',
  gateway_raw   JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at   TIMESTAMPTZ
);
CREATE INDEX idx_payments_result ON payments(result_id);
CREATE INDEX idx_payments_student ON payments(student_id);

-- ---------- AUDIT LOGS ----------
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  role        user_role,
  action      VARCHAR(100) NOT NULL,
  target      VARCHAR(200),
  details     JSONB,
  ip_address  VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ---------- SETTINGS ----------
CREATE TABLE settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at auto-touch trigger
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_results_updated BEFORE UPDATE ON results FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
