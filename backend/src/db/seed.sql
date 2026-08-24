-- ============================================================
-- Seed data for HIGCHEMS Result Portal
-- Run AFTER schema.sql
-- ============================================================

-- Grading scale (5-point system)
INSERT INTO grading_scale (grade, min_score, max_score, grade_point, remark) VALUES
('A', 70, 100, 5.00, 'Excellent'),
('B', 60, 69.99, 4.00, 'Very Good'),
('C', 50, 59.99, 3.00, 'Good'),
('D', 45, 49.99, 2.00, 'Pass'),
('E', 40, 44.99, 1.00, 'Pass'),
('F', 0, 39.99, 0.00, 'Fail');

-- Default Super Admin
-- username: superadmin   password: SuperAdmin@2026
-- CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN.
INSERT INTO users (id, role, username, password_hash, must_change_password, is_active)
VALUES (
  gen_random_uuid(),
  'super_admin',
  'superadmin',
  'e23671f253c5ca539b356fba15c68268:2d877750c7fa913a3c30898f74d38ab997110c39d1c13244835b05879127dbfd88befb283cfa081bc72845c735447bea82f5722049c3ca43ffbe187ed2c35841',
  false,
  true
);

-- Academic structure sample data
INSERT INTO faculties (id, name) VALUES
  (gen_random_uuid(), 'Faculty of Health Sciences');

INSERT INTO departments (id, faculty_id, name)
SELECT gen_random_uuid(), f.id, 'Community Health' FROM faculties f WHERE f.name = 'Faculty of Health Sciences';

INSERT INTO programmes (id, department_id, name)
SELECT gen_random_uuid(), d.id, 'Community Health' FROM departments d WHERE d.name = 'Community Health';

INSERT INTO levels (id, name, sort_order) VALUES
  (gen_random_uuid(), 'ND I', 1),
  (gen_random_uuid(), 'ND II', 2),
  (gen_random_uuid(), 'HND I', 3),
  (gen_random_uuid(), 'HND II', 4);

INSERT INTO academic_sessions (id, name, is_current) VALUES
  (gen_random_uuid(), '2025/2026', true);

INSERT INTO semesters (id, session_id, name, is_current)
SELECT gen_random_uuid(), s.id, 'First Semester', false FROM academic_sessions s WHERE s.name = '2025/2026';
INSERT INTO semesters (id, session_id, name, is_current)
SELECT gen_random_uuid(), s.id, 'Second Semester', true FROM academic_sessions s WHERE s.name = '2025/2026';

-- Sample courses (ND I, Second Semester, Community Health programme)
INSERT INTO courses (id, code, title, credit_unit, department_id, programme_id, level_id, semester)
SELECT gen_random_uuid(), c.code, c.title, c.unit, d.id, p.id, l.id, 'Second Semester'
FROM (VALUES
  ('CHH 101', 'Community Health Theory', 3),
  ('BIO 101', 'General Biology', 3),
  ('ENG 101', 'English Language', 2),
  ('ICT 101', 'Computer Appreciation', 2),
  ('GST 101', 'Use of Library', 1)
) AS c(code, title, unit)
CROSS JOIN departments d
CROSS JOIN programmes p
CROSS JOIN levels l
WHERE d.name = 'Community Health' AND p.name = 'Community Health' AND l.name = 'ND I';

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('school_name', '"Higher Ground College of Health and Management Sciences Takum"'),
  ('school_address', '"No 8 High Level, Opposite Army Barracks Takum"'),
  ('school_motto', '"Knowledge is Light"');
