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

export const experimentAPI = {
  create: (data) => api.post('/experiments', data),
  getAll: () => api.get('/experiments'),
  getById: (id) => api.get('/experiments/' + id),
  update: (id, data) => api.patch('/experiments/' + id, data),
  publish: (id) => api.post('/experiments/' + id + '/publish'),
  getByPublicId: (publicId) => api.get('/experiments/public/' + publicId),
};

export const sessionAPI = {
  start: (publicId) => api.post('/sessions/start/' + publicId),
  submitCalibration: (sessionId, data) => api.post('/sessions/' + sessionId + '/calibration', data),
  submitResponse: (sessionId, data) => api.post('/sessions/' + sessionId + '/responses', data),
  complete: (sessionId) => api.post('/sessions/' + sessionId + '/complete'),
};

export default api;
