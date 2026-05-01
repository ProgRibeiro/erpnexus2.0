import axios from "axios";

import { useAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
});

const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
});

let refreshPromise = null;

function getFallbackData(url = "") {
  if (url.includes("/dashboard/")) {
    return {
      receita: 0,
      despesa: 0,
      lucro: 0,
      contas_receber: 0,
      contas_pagar: 0,
      saldo_total: 0,
      por_mes: [],
      contas_receber_lista: [],
      contas_pagar_lista: [],
      despesas_categoria: [],
    };
  }

  if (url.includes("/configuracoes/empresa/")) {
    return {};
  }

  return [];
}

function isHtmlFallback(data) {
  return typeof data === "string" && data.trim().toLowerCase().startsWith("<!doctype html");
}

function isReadRequest(config = {}) {
  return !config.method || config.method.toLowerCase() === "get";
}

api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (isReadRequest(response.config) && isHtmlFallback(response.data)) {
      return {
        ...response,
        data: getFallbackData(response.config.url),
      };
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = useAuthStore.getState().refreshToken;

    if (isReadRequest(originalRequest) && (!error.response || error.response.status >= 500)) {
      return {
        data: getFallbackData(originalRequest?.url),
        status: 200,
        statusText: "Offline fallback",
        headers: {},
        config: originalRequest,
      };
    }

    if (
      error.response?.status !== 401 ||
      !refreshToken ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = refreshApi
        .post("/auth/refresh/", { refresh: refreshToken })
        .then((response) => {
          const currentState = useAuthStore.getState();
          currentState.setAuth({
            user: currentState.user,
            access: response.data.access,
            refresh: response.data.refresh || refreshToken,
          });
          return response.data.access;
        })
        .catch((refreshError) => {
          useAuthStore.getState().clearAuth();
          throw refreshError;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newAccessToken = await refreshPromise;
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    return api(originalRequest);
  }
);

export default api;
