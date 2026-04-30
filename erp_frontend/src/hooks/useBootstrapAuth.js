import { useEffect } from "react";

import authService from "../services/authService";
import { useAuthStore } from "../store/authStore";

export function useBootstrapAuth() {
  useEffect(() => {
    const { accessToken, user, setAuth, refreshToken, clearAuth } =
      useAuthStore.getState();

    if (!accessToken || user) {
      return;
    }

    authService
      .me()
      .then((profile) => {
        setAuth({ user: profile, access: accessToken, refresh: refreshToken });
      })
      .catch(() => {
        clearAuth();
      });
  }, []);
}
