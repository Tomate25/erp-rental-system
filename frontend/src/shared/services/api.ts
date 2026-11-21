import axios from 'axios';
import {
  clearAuthSession,
  getAuthToken,
  updateAuthToken,
} from '../utils/auth-storage';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el Bearer Token en cada petición
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Estado de refresco para evitar múltiples peticiones concurrentes a /auth/refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor para manejar errores globales y refresco transparente de tokens vía cookie HttpOnly
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es un error 401 y no proviene de login, refresh ni logout
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/logout')
    ) {
      if (isRefreshing) {
        // Encolar peticiones pendientes mientras el token se refresca
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresco seguro mediante cookie HttpOnly enviada automáticamente por el navegador
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = refreshResponse.data;

        updateAuthToken(accessToken);

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthSession();
        delete api.defaults.headers.common.Authorization;
        window.dispatchEvent(new Event('bismark:auth-expired'));
        const currentPath = window.location.pathname;
        if (currentPath !== '/' && currentPath !== '' && currentPath !== '/login') {
          window.location.href = '/';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403 && typeof window !== 'undefined') {
      const serverMsg = error.response?.data?.message;
      const msg = Array.isArray(serverMsg)
        ? serverMsg.join(' ')
        : typeof serverMsg === 'string' && serverMsg.trim()
          ? serverMsg
          : 'No tienes permiso para realizar esta acción en este módulo.';
      window.dispatchEvent(
        new CustomEvent('bismark:permission-denied', {
          detail: { message: msg },
        }),
      );
    }

    return Promise.reject(error);
  }
);

export default api;
