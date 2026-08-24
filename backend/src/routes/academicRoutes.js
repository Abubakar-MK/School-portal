const express = require('express');
const ctrl = require('../controllers/academicController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Reads: any authenticated role can view the academic structure (needed
// to populate dropdowns for registration, results entry, etc.)
router.get('/faculties', ctrl.listFaculties);
router.get('/departments', ctrl.listDepartments);
router.get('/programmes', ctrl.listProgrammes);
router.get('/levels', ctrl.listLevels);
router.get('/sessions', ctrl.listSessions);
router.get('/semesters', ctrl.listSemesters);

// Writes: Super Admin only.
router.post('/faculties', requireRole('super_admin'), ctrl.createFaculty);
router.patch('/faculties/:id', requireRole('super_admin'), ctrl.updateFaculty);
router.delete('/faculties/:id', requireRole('super_admin'), ctrl.deleteFaculty);

router.post('/departments', requireRole('super_admin'), ctrl.createDepartment);
router.patch('/departments/:id', requireRole('super_admin'), ctrl.updateDepartment);
router.delete('/departments/:id', requireRole('super_admin'), ctrl.deleteDepartment);

router.post('/programmes', requireRole('super_admin'), ctrl.createProgramme);
router.patch('/programmes/:id', requireRole('super_admin'), ctrl.updateProgramme);
router.delete('/programmes/:id', requireRole('super_admin'), ctrl.deleteProgramme);

router.post('/levels', requireRole('super_admin'), ctrl.createLevel);
router.delete('/levels/:id', requireRole('super_admin'), ctrl.deleteLevel);

router.post('/sessions', requireRole('super_admin'), ctrl.createSession);
router.patch('/sessions/:id/activate', requireRole('super_admin'), ctrl.setCurrentSession);
router.delete('/sessions/:id', requireRole('super_admin'), ctrl.deleteSession);

router.patch('/semesters/:id/activate', requireRole('super_admin'), ctrl.setCurrentSemester);

module.exports = router;
