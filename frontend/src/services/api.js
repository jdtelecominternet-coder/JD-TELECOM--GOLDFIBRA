import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('jd_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      const data = err.response?.data;

      // Sessão substituída por outro dispositivo
      if (data?.error === 'session_replaced') {
        localStorage.removeItem('jd_token');
        localStorage.removeItem('jd_user');
        // Mostra alerta e redireciona para login
        alert('🔒 Sua sessão foi encerrada.\nOutro dispositivo acessou sua conta.');
        window.location.href = '/login';
        return Promise.reject(err);
      }

      // Não redirecionar se houver upload/câmera ativa ou se for rota de foto
      const url = err.config?.url || '';
      const isUpload = err.config?.headers?.['Content-Type']?.includes('multipart') ||
                       url.includes('photo') || url.includes('upload') || url.includes('foto');
      const hasFileInput = document.querySelector('input[type="file"]:focus, input[capture]');
      if (!isUpload && !hasFileInput) {
        localStorage.removeItem('jd_token');
        localStorage.removeItem('jd_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
