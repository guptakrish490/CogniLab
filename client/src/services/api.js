import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  },
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

export const experimentAPI = {
  create: (data) => api.post('/experiments', data),
  getAll: () => api.get('/experiments'),
  getById: (id) => api.get('/experiments/' + id),
  update: (id, data) => api.patch('/experiments/' + id, data),
  publish: (id) => api.post('/experiments/' + id + '/publish'),
  getByPublicId: (publicId) => api.get('/experiments/public/' + publicId),
};

export const trialAPI = {
  create: (expId, data) => api.post('/experiments/' + expId + '/trials', data),
  getByExperiment: (expId) => api.get('/experiments/' + expId + '/trials'),
  update: (expId, trialId, data) => api.patch('/experiments/' + expId + '/trials/' + trialId, data),
  delete: (expId, trialId) => api.delete('/experiments/' + expId + '/trials/' + trialId),
};

export const sessionAPI = {
  start: (publicId) => api.post('/sessions/start/' + publicId),
  submitCalibration: (sessionId, data) => api.post('/sessions/' + sessionId + '/calibration', data),
  submitResponse: (sessionId, data) => api.post('/sessions/' + sessionId + '/responses', data),
  complete: (sessionId) => api.post('/sessions/' + sessionId + '/complete'),
};

export const resultAPI = {
  getExperimentResults: (expId) => api.get('/experiments/' + expId + '/results'),
  getSessionResult: (expId, sessionId) => api.get('/experiments/' + expId + '/results/' + sessionId),
};

export default api;
