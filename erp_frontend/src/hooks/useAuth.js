import { getStoredAuthState, useAuthStore } from "../store/authStore";

import authService from "../services/authService";

export function useAuth() {
  const { user, accessToken, refreshToken, setAuth, clearAuth } = useAuthStore();
  const storedAuth = getStoredAuthState();
  const currentAccessToken = accessToken || storedAuth.accessToken;
  const currentRefreshToken = refreshToken || storedAuth.refreshToken;

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Limpa o estado local mesmo se a API de logout falhar.
    } finally {
      clearAuth();
    }
  };

  return {
    user: user || storedAuth.user,
    accessToken: currentAccessToken,
    refreshToken: currentRefreshToken,
    isAuthenticated: Boolean(currentAccessToken),
    setAuth,
    clearAuth,
    logout,
  };
}
