// Serviço de API para o painel Master Admin
// Usa endpoint /api/master/ com token separado (master_token)

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const masterApi = axios.create({
  baseURL: `${BASE_URL}/api/master/`,
  headers: { "Content-Type": "application/json" },
});

masterApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("master_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

masterApi.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("master_refresh");
      if (refresh) {
        try {
          const res = await axios.post(`${BASE_URL}/api/master/auth/refresh/`, { refresh });
          localStorage.setItem("master_token", res.data.access);
          localStorage.setItem("master_refresh", res.data.refresh);
          original.headers.Authorization = `Bearer ${res.data.access}`;
          return masterApi(original);
        } catch {
          localStorage.removeItem("master_token");
          localStorage.removeItem("master_refresh");
          window.location.href = "/master/login";
        }
      } else {
        window.location.href = "/master/login";
      }
    }
    return Promise.reject(error);
  }
);

export default masterApi;
