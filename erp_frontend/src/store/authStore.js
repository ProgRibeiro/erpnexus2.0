import { create } from "zustand";
import { persist } from "zustand/middleware";

export function getStoredAuthState() {
  try {
    const storedAuth = JSON.parse(localStorage.getItem("erp_auth") || "{}");
    const state = storedAuth?.state || storedAuth || {};

    return {
      user: state.user || null,
      accessToken:
        state.accessToken ||
        state.access ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("access") ||
        null,
      refreshToken:
        state.refreshToken ||
        state.refresh ||
        localStorage.getItem("refreshToken") ||
        localStorage.getItem("refresh") ||
        null,
    };
  } catch {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
    };
  }
}

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: ({ user, access, refresh }) =>
        set({
          user,
          accessToken: access,
          refreshToken: refresh,
        }),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        }),
    }),
    {
      name: "erp_auth",
    }
  )
);
