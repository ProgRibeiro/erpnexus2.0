import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const { user, accessToken, refreshToken, setAuth, clearAuth } = useAuthStore();

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: Boolean(accessToken),
    setAuth,
    clearAuth,
  };
}
