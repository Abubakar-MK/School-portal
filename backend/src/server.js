require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const academicRoutes = require('./routes/academicRoutes');
const courseRoutes = require('./routes/courseRoutes');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const resultRoutes = require('./routes/resultRoutes');
const auditRoutes = require('./routes/auditRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));

// General API rate limit (login endpoints have their own, stricter limit).
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));

// Serve uploaded student photos. Read-only, no directory listing.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'HIGCHEMS Result Portal API' }));

app.use('/api/auth', authRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

// Serve the built frontend (npm run build in /frontend) so the whole
// site — pages and API — can be reached through a single port. This is
// what lets one ngrok tunnel show the entire app to someone outside
// your network, instead of two tunnels and CORS/localhost problems.
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Central error handler — never leak stack traces to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.message && err.message.includes('Only JPEG')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`HIGCHEMS Result Portal API listening on port ${PORT}`);
});
