import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('higchems_user');
    return stored ? JSON.parse(stored) : null;
  });

  const persist = (token, userData) => {
    localStorage.setItem('higchems_token', token);
    localStorage.setItem('higchems_user', JSON.stringify(userData));
    setUser(userData);
  };

  const staffLogin = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/staff-login', { username, password });
    persist(data.token, data.user);
    return data.user;
  }, []);

  const studentLogin = useCallback(async (matricNumber, password) => {
    const { data } = await api.post('/auth/student-login', { matricNumber, password });
    persist(data.token, data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('higchems_token');
    localStorage.removeItem('higchems_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('higchems_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, staffLogin, studentLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
