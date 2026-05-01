import { getStoredAuthState, useAuthStore } from "../store/authStore";

export function useAuth() {
  const { user, accessToken, refreshToken, setAuth, clearAuth } = useAuthStore();
  const storedAuth = getStoredAuthState();
  const currentAccessToken = accessToken || storedAuth.accessToken;
  const currentRefreshToken = refreshToken || storedAuth.refreshToken;

  return {
    user: user || storedAuth.user,
    accessToken: currentAccessToken,
    refreshToken: currentRefreshToken,
    isAuthenticated: Boolean(currentAccessToken),
    setAuth,
    clearAuth,
  };
}
