const express = require('express');
const ctrl = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('super_admin'));

router.get('/', ctrl.listAdmins);
router.post('/', ctrl.createAdmin);
router.patch('/:id/active', ctrl.setAdminActive);
router.delete('/:id', ctrl.deleteAdmin);

module.exports = router;
