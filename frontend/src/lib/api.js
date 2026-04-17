import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Only redirect on auth endpoints if token is stale, not on login attempts
      const isAuthRoute = err.config?.url?.includes('/auth/');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const candidates = {
  getProfile: () => api.get('/candidates/profile'),
  uploadResume: (file) => {
    const form = new FormData();
    form.append('resume', file);
    return api.post('/candidates/resume', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  submitGitHub: (github_url) => api.post('/candidates/github', { github_url }),
  getRecommendations: () => api.get('/candidates/recommendations'),
};

export const jobs = {
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  scrape: () => api.post('/jobs/scrape'),
  sourceStats: () => api.get('/jobs/stats/sources'),
};

export const matches = {
  submitFeedback: (data) => api.post('/matches/feedback', data),
};

export default api;
