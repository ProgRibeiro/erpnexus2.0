import api from "./api";

const usuariosService = {
  listar: async () => {
    const response = await api.get("/auth/");
    return response.data;
  },

  criar: async (payload) => {
    const response = await api.post("/auth/", payload);
    return response.data;
  },

  atualizar: async (usuarioId, payload) => {
    const response = await api.patch(`/auth/${usuarioId}/`, payload);
    return response.data;
  },

  desativar: async (usuarioId) => {
    const response = await api.delete(`/auth/${usuarioId}/`);
    return response.data;
  },

  resetarSenha: async (usuarioId) => {
    const response = await api.post(`/auth/${usuarioId}/resetar-senha/`);
    return response.data;
  },

  obterPerfil: async () => {
    const response = await api.get("/auth/perfil/");
    return response.data;
  },

  atualizarPerfil: async (payload) => {
    const response = await api.patch("/auth/perfil/", payload);
    return response.data;
  },
};

export default usuariosService;
