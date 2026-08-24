# HIGCHEMS Student Result Management Portal

Higher Ground College of Health and Management Sciences Takum
No 8 High Level, Opposite Army Barracks Takum — "Knowledge is Light"

A full-stack Student Result Management Portal with three roles (Super Admin,
Admin, Student), a PostgreSQL database, a Node/Express API, and a React
frontend.

---

## 1. What's inside

```
higchems-portal/
  backend/     Node.js + Express API, PostgreSQL schema, auth, uploads
  frontend/    React + Vite + Tailwind CSS single-page app
```

## 2. Requirements

- Node.js 18+ and npm
- PostgreSQL 14+ (local install, or a free hosted instance — Railway, Render,
  Supabase, Neon all work)

## 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — generate one with:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `CLIENT_ORIGIN` — leave as `http://localhost:5173` for local dev

Create the database, then apply the schema and seed data:

```bash
createdb higchems_portal        # or create it however your Postgres host requires
npm run migrate                 # applies backend/src/db/schema.sql
npm run seed                    # applies backend/src/db/seed.sql
```

The seed script prints a default Super Admin login:

```
username: superadmin
password: SuperAdmin@2026
```

**Log in and change this password immediately** — see section 6.

Start the API:

```bash
npm run dev      # auto-restarts on file changes (Node's built-in --watch)
# or
npm start
```

The API listens on `http://localhost:4000` by default. Visit
`http://localhost:4000/api/health` to confirm it's running.

## 4. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

`.env` only needs `VITE_API_BASE_URL` — leave it as
`http://localhost:4000/api` if you used the default backend port.

```bash
npm run dev
```

Open `http://localhost:5173`.

## 5. First-time walkthrough

1. Log in as Super Admin (`superadmin` / `SuperAdmin@2026`), then immediately
   change the password when prompted.
2. **Academic Structure** — the seed data already includes one faculty,
   department, programme, four levels, the 2025/2026 session (with both
   semesters auto-created) and five sample ND I courses, matching the
   reference images. Add more faculties/departments/programmes/levels/
   sessions from that page as needed.
3. **Admins** — create an Admin account. A one-time temporary password is
   shown on screen; hand it to that admin, who must change it on first login.
4. Log in as the Admin (in a private/incognito window, or after logging out)
   and use **Register Student**. The student's phone number becomes their
   initial password.
5. Still as Admin, go to **Enter Results**, look up the student by matric
   number for the current session/semester, enter CA + Exam scores per
   course, and **Submit** for approval.
6. Back as Super Admin, go to **Result Approval**, review the entry, and
   **Approve** or **Reject** (a reason is required to reject).
7. Once approved, go to **Published Results** and **Publish** it.
8. Log in as the student (matric number + the password they were forced to
   set on first login) and open **My Current Result** — GPA, CGPA and
   academic standing are all computed server-side. Use **Print Result** for
   an A4-ready printable copy.

## 6. Security notes (read this)

- Passwords are hashed with Node's built-in `crypto.scrypt` — never stored
  in plaintext, and no native-binary dependency (like `bcrypt`) to fight
  with during install.
- **Every role and ownership check is enforced in the backend**
  (`backend/src/middleware/auth.js`), not just hidden in the frontend menu.
  In particular, `requireOwnStudentRecord` ignores whatever student ID a
  request might contain and always resolves the student strictly from the
  authenticated JWT — a student can never fetch another student's result by
  editing a URL, ID, or request body. The `ProtectedRoute` component in the
  frontend is UX convenience only; it is not a security boundary and the
  code says so.
- Grades, grade points, quality points, GPA and CGPA are always computed
  server-side (`backend/src/utils/grading.js`) from raw scores against the
  configurable `grading_scale` table — no client can submit a GPA directly.
- Every sensitive action (logins, registrations, result submissions,
  approvals, rejections, publications, password changes, admin
  creation/disabling) is written to `audit_logs`, which has no update/delete
  route by design.
- Rate limiting is applied to login endpoints specifically, plus a general
  API-wide limit.
- Change the default Super Admin password and `JWT_SECRET` before using
  this anywhere beyond your own machine.

## 7. Deploying

- **Database:** any managed PostgreSQL (Railway, Render, Supabase, Neon,
  RDS) — run `npm run migrate` and `npm run seed` once against it.
- **Backend:** any Node host (Railway, Render, Fly.io, a VPS). Set the same
  environment variables as `.env.example`, and set `CLIENT_ORIGIN` to your
  deployed frontend's URL.
- **Frontend:** `npm run build` produces a static `dist/` folder — deploy it
  to Vercel, Netlify, Render static sites, or any static host, with
  `VITE_API_BASE_URL` pointing at your deployed backend.
- **Uploaded photos** are currently stored on the backend's local disk
  (`backend/uploads/students`). On most hosts this is **not persistent**
  across deploys/restarts — for production, swap `backend/src/middleware/upload.js`
  to write to S3, Cloudinary, or similar object storage instead. The rest of
  the app only depends on `students.photo_url` being a reachable URL, so
  this swap is contained to that one file plus the two upload routes.

## 8. Extending

The codebase intentionally mirrors the database schema 1:1 in the API
routes/controllers, and the frontend is one page per screen with a couple of
small shared hooks/components — there's no hidden abstraction layer to learn
before adding a new report, a new academic-structure entity, or a new result
status.
