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
  getBookmarked: () => api.get('/candidates/bookmarked'),
  getApplied: () => api.get('/candidates/applied'),
  tailorResume: (job_id) => api.post('/candidates/tailor-resume', { job_id }),
  generateTailoredResume: (job_id, tailor_suggestions) =>
    api.post('/candidates/generate-tailored-resume', { job_id, tailor_suggestions }),
  generateCoverLetter: (job_id) => api.post('/candidates/cover-letter', { job_id }),
  getInterviewPrep: (job_id) => api.post('/candidates/interview-prep', { job_id }),
  getLearningPath: () => api.get('/candidates/learning-path'),
  getAnalytics: () => api.get('/candidates/analytics'),
  getResumeVersions: () => api.get('/candidates/resume-versions'),
  createResumeVersion: (data) => api.post('/candidates/resume-versions', data),
  activateResumeVersion: (id) => api.put(`/candidates/resume-versions/${id}/activate`),
  getSalaryInsights: () => api.get('/candidates/salary-insights'),
  getNotifications: () => api.get('/candidates/notifications'),
  markNotificationsRead: () => api.put('/candidates/notifications/read-all'),
  getApplications: () => api.get('/candidates/applications'),
  createApplication: (data) => api.post('/candidates/applications', data),
  updateApplication: (id, data) => api.put(`/candidates/applications/${id}`, data),
  startMockInterview: (job_id) => api.post('/candidates/mock-interview/start', { job_id }),
  sendMockMessage: (id, message) => api.post(`/candidates/mock-interview/${id}/message`, { message }),
  endMockInterview: (id) => api.post(`/candidates/mock-interview/${id}/end`),
  getMockInterviews: () => api.get('/candidates/mock-interviews'),
  getCompanyResearch: (company) => api.get(`/candidates/company-research/${encodeURIComponent(company)}`),
  getPortfolio: (userId) => api.get(`/candidates/portfolio/${userId}`),
};

export const jobs = {
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  scrape: () => api.post('/jobs/scrape'),
  sourceStats: () => api.get('/jobs/stats/sources'),
  getSimilar: (id) => api.get(`/jobs/${id}/similar`),
};

export const matches = {
  submitFeedback: (data) => api.post('/matches/feedback', data),
};

export default api;
