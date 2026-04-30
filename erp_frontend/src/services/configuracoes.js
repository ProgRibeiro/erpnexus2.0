import api from "./api";

const configuracoesService = {
  obterEmpresa: async () => {
    const response = await api.get("/configuracoes/empresa/");
    return response.data;
  },
  salvarEmpresa: async (payload) => {
    const response = await api.patch("/configuracoes/empresa/", payload);
    return response.data;
  },
  listarNotificacoes: async () => {
    const response = await api.get("/configuracoes/notificacoes/");
    return response.data;
  },
  salvarNotificacoes: async (itens) => {
    const response = await api.patch("/configuracoes/notificacoes/", { itens });
    return response.data;
  },
};

export default configuracoesService;
