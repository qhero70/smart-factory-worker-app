import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
});

// 請求攔截器：添加認證令牌
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 響應攔截器：刷新令牌
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalConfig = error.config;

    if (error.response?.status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        await SecureStore.setItemAsync('accessToken', accessToken);

        originalConfig.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalConfig);
      } catch (error) {
        // 刷新失敗，需要重新登入
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
