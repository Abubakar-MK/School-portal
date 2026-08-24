import axios from 'axios';

// In normal development (npm run dev) we call the API directly on
// localhost:4000. In a production build (npm run build) — including
// the one served through ngrok for client review — we call "/api" on
// whatever domain the page itself was loaded from, so it keeps working
// no matter what address (ngrok, a real domain, etc.) the site is on.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api'),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('higchems_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('higchems_token');
      localStorage.removeItem('higchems_user');
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
