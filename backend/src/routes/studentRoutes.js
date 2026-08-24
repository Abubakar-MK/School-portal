const express = require('express');
const ctrl = require('../controllers/studentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadStudentPhoto, uploadCsv } = require('../middleware/upload');

const router = express.Router();
router.use(requireAuth, requireRole('super_admin', 'admin'));

router.get('/', ctrl.listStudents);
router.get('/:id', ctrl.getStudent);
router.post('/', uploadStudentPhoto.single('photo'), ctrl.registerStudent);
router.post('/bulk-upload', uploadCsv.single('file'), ctrl.bulkRegisterStudents);
router.patch('/:id', ctrl.updateStudent);
router.post('/:id/photo', uploadStudentPhoto.single('photo'), ctrl.uploadPhoto);
router.delete('/:id', ctrl.deleteStudent);

// Super Admin only.
router.post('/:id/reset-password', requireRole('super_admin'), ctrl.resetStudentPassword);

module.exports = router;
