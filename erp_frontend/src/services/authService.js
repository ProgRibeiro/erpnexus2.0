import api from "./api";

const authService = {
  login: async ({ identifier, password }) => {
    const payload = identifier.includes("@")
      ? { email: identifier, password }
      : { username: identifier, password };

    const response = await api.post("/auth/login/", payload);
    return response.data;
  },

  logout: async () => {
    const refreshToken = JSON.parse(localStorage.getItem("erp_auth") || "{}")?.state
      ?.refreshToken;

    if (!refreshToken) {
      return;
    }

    await api.post("/auth/logout/", { refresh: refreshToken });
  },

  me: async () => {
    const response = await api.get("/auth/perfil/");
    return response.data;
  },

  atualizarPerfil: async (payload) => {
    const response = await api.patch("/auth/perfil/", payload);
    return response.data;
  },
};

export default authService;
