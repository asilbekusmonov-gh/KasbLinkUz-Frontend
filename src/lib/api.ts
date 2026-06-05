import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1/';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the auth token to headers
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = Cookies.get('refresh_token');
      
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}auth/refresh/`, {
            refresh: refreshToken
          });
          
          Cookies.set('access_token', res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token is invalid or expired
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          // Optional: redirect to login or handle in AuthContext
        }
      }
    }
    return Promise.reject(error);
  }
);
