import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import * as SecureStore from 'expo-secure-store';

export function useAuth() {
  const { user, accessToken, refreshToken, setAuth, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync('user');
        const storedAccessToken = await SecureStore.getItemAsync('accessToken');
        const storedRefreshToken = await SecureStore.getItemAsync('refreshToken');

        if (storedUser && storedAccessToken && storedRefreshToken) {
          setAuth(JSON.parse(storedUser), storedAccessToken, storedRefreshToken);
        }
      } catch (error) {
        console.error('Failed to load auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  return { user, accessToken, refreshToken, isLoading, clearAuth };
}
