import axios from 'axios';

const BASE = 'http://localhost:8000/api';
const api  = axios.create({ baseURL: BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  signup:               data  => api.post('/auth/signup', data),
  login:                data  => api.post('/auth/login', data),
  me:                   ()    => api.get('/auth/me'),
  saveScore:            data  => api.post('/auth/save-score', data),
  getProgress:          ()    => api.get('/auth/progress'),
  quizHistory:          ()    => api.get('/auth/quiz-history'),
  resendVerification:   ()    => api.post('/auth/resend-verification'),
  verifyEmail:          token => api.get(`/auth/verify-email?token=${token}`),
};

export const docsAPI = {
  upload:    fd => api.post('/documents/upload', fd),
  getSession:() => api.get('/documents/session'),
  ragStatus: () => api.get('/documents/rag-status'),
  clear:     () => api.delete('/documents/clear'),
  getImages: (docIndex) => api.get(`/documents/images/${docIndex}`),
};

export const aiAPI = {
  generateQuiz:       (difficulty, num_questions = 10) => api.post('/ai/quiz/generate', { difficulty, num_questions }),
  regenForChanges:    (difficulty, num_questions = 10) => api.post('/ai/quiz/regenerate-for-changes', { difficulty, num_questions }),
  detectWeakAreas:    wrong  => api.post('/ai/weak-areas', wrong),
  generateFlashcards: ()     => api.get('/ai/flashcards'),
  hybridSearch:       (query, n = 5) => api.post('/ai/search', { query, n_results: n }),
  compareDocuments:   ()     => api.post('/ai/compare-docs'),
  ollamaStatus:       ()     => api.get('/ai/ollama-status'),
  getSummaryStream:   ()     => `${BASE}/ai/summary`,
  getChatStream:      ()     => `${BASE}/ai/chat`,
  getChatHistory:     ()     => api.get('/ai/chat/history'),
  clearChatHistory:   ()     => api.delete('/ai/chat/history'),
};

export default api;
