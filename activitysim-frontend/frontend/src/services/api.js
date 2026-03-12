import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
});

export const projectsAPI = {
  list: () => api.get('/projects'),
  create: (name, description) => api.post('/projects', null, { params: { name, description } }),
  get: (id) => api.get(`/projects/${id}`),
};

export const settingsAPI = {
  get: (projectId) => api.get(`/projects/${projectId}/settings`),
  update: (projectId, settings) => api.post(`/projects/${projectId}/settings`, null, { params: { settings } }),
};

export const filesAPI = {
  list: (projectId) => api.get(`/projects/${projectId}/files`),
};

export const configsAPI = {
  upload: (projectId, files) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    return api.post(`/projects/${projectId}/upload-configs`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const runsAPI = {
  start: (projectId) => api.post(`/projects/${projectId}/run`),
  getStatus: (projectId, runId) => api.get(`/projects/${projectId}/run/status/${runId}`),
  stop: (projectId, runId) => api.post(`/projects/${projectId}/run/stop/${runId}`),
};

export const resultsAPI = {
  get: (projectId) => api.get(`/projects/${projectId}/results`),
};

export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
