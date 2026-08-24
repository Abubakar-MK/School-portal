const express = require('express');
const ctrl = require('../controllers/courseController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', ctrl.listCourses);
// Course catalog is managed by Super Admin only; Admin can view/select
// courses for result entry but not create/edit the catalog itself.
router.post('/', requireRole('super_admin'), ctrl.createCourse);
router.patch('/:id', requireRole('super_admin'), ctrl.updateCourse);
router.delete('/:id', requireRole('super_admin'), ctrl.deleteCourse);

module.exports = router;
