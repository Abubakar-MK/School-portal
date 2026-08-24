import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

/**
 * Loads faculties/departments/programmes/levels/sessions/semesters and
 * exposes cascading filter helpers, plus a reload() to re-fetch after
 * any create/delete so lists reflect changes without a full page refresh.
 * Shared by registration, course, result-entry forms and the Academic
 * Structure management screen.
 */
export function useAcademicStructure() {
  const [data, setData] = useState({
    faculties: [], departments: [], programmes: [], levels: [], sessions: [], semesters: [],
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    return Promise.all([
      api.get('/academic/faculties'),
      api.get('/academic/departments'),
      api.get('/academic/programmes'),
      api.get('/academic/levels'),
      api.get('/academic/sessions'),
      api.get('/academic/semesters'),
    ]).then(([f, d, p, l, s, sem]) => {
      setData({
        faculties: f.data, departments: d.data, programmes: p.data,
        levels: l.data, sessions: s.data, semesters: sem.data,
      });
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const departmentsFor = (facultyId) => data.departments.filter((d) => d.faculty_id === facultyId);
  const programmesFor = (departmentId) => data.programmes.filter((p) => p.department_id === departmentId);
  const semestersFor = (sessionId) => data.semesters.filter((s) => s.session_id === sessionId);

  return { ...data, loading, reload, departmentsFor, programmesFor, semestersFor };
}
