const express = require('express');
const ctrl = require('../controllers/resultController');
const { requireAuth, requireRole, requireOwnStudentRecord } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ---------- Student self-service (read-only, strictly own record) ----------
router.get('/student/me/current', requireRole('student'), requireOwnStudentRecord, ctrl.getMyCurrentResult);
router.get('/student/me/history', requireRole('student'), requireOwnStudentRecord, ctrl.getMyResultHistory);
router.get('/student/me/:resultId', requireRole('student'), requireOwnStudentRecord, ctrl.getMyResultById);

// ---------- Admin: entry & submission ----------
router.post('/drafts', requireRole('admin', 'super_admin'), ctrl.getOrCreateDraft);
router.post('/:resultId/entries', requireRole('admin', 'super_admin'), ctrl.saveEntry);
router.delete('/:resultId/entries/:courseId', requireRole('admin', 'super_admin'), ctrl.deleteEntry);
router.post('/:id/submit', requireRole('admin', 'super_admin'), ctrl.submitResult);

// ---------- Shared read (admin + super admin) ----------
router.get('/', requireRole('admin', 'super_admin'), ctrl.listResults);
router.get('/:id', requireRole('admin', 'super_admin'), ctrl.getResultDetail);

// ---------- Super Admin only: approval workflow ----------
router.post('/approve-all', requireRole('super_admin'), ctrl.approveAllSubmitted);
router.post('/publish-all', requireRole('super_admin'), ctrl.publishAllApproved);
router.post('/:id/approve', requireRole('super_admin'), ctrl.approveResult);
router.post('/:id/reject', requireRole('super_admin'), ctrl.rejectResult);
router.post('/:id/publish', requireRole('super_admin'), ctrl.publishResult);
router.post('/:id/unpublish', requireRole('super_admin'), ctrl.unpublishResult);

module.exports = router;
