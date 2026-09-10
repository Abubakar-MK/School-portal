const express = require('express');
const ctrl = require('../controllers/paymentController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/initiate', requireRole('student'), ctrl.initiatePayment);
router.get('/verify/:reference', ctrl.verifyPayment);

// Super Admin oversight of every payment attempt, and manual overrides.
router.get('/', requireRole('super_admin'), ctrl.listPayments);
router.post('/results/:resultId/grant-access', requireRole('super_admin'), ctrl.grantAccess);
router.post('/results/:resultId/revoke-access', requireRole('super_admin'), ctrl.revokeAccess);

module.exports = router;
