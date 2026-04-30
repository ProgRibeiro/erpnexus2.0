import api from "./api";

const unwrap = (data) => data.results ?? data;

const financeiroService = {
  dashboard: async (params) => {
    const response = await api.get("/financeiro/dashboard/", { params });
    return response.data;
  },
  fluxoCaixa: async (params) => {
    const response = await api.get("/financeiro/fluxo-caixa/", { params });
    return response.data;
  },
  dre: async (params) => {
    const response = await api.get("/financeiro/relatorio-dre/", { params });
    return response.data;
  },
  listarLancamentos: async (params) => {
    const response = await api.get("/financeiro/lancamentos/", { params });
    return unwrap(response.data);
  },
  criarLancamento: async (payload) => {
    const response = await api.post("/financeiro/lancamentos/", payload);
    return response.data;
  },
  atualizarLancamento: async (id, payload) => {
    const response = await api.patch(`/financeiro/lancamentos/${id}/`, payload);
    return response.data;
  },
  removerLancamento: async (id) => api.delete(`/financeiro/lancamentos/${id}/`),
  confirmarPagamento: async (id, payload = {}) => {
    const response = await api.post(
      `/financeiro/lancamentos/${id}/confirmar-pagamento/`,
      payload
    );
    return response.data;
  },
  listarContas: async () => {
    const response = await api.get("/financeiro/contas-bancarias/");
    return unwrap(response.data);
  },
  salvarConta: async (payload, id) => {
    const response = id
      ? await api.patch(`/financeiro/contas-bancarias/${id}/`, payload)
      : await api.post("/financeiro/contas-bancarias/", payload);
    return response.data;
  },
  listarCategorias: async (params) => {
    const response = await api.get("/financeiro/categorias/", { params });
    return unwrap(response.data);
  },
  salvarCategoria: async (payload, id) => {
    const response = id
      ? await api.patch(`/financeiro/categorias/${id}/`, payload)
      : await api.post("/financeiro/categorias/", payload);
    return response.data;
  },
  resumoCategorias: async (params) => {
    const response = await api.get("/financeiro/categorias/resumo/", { params });
    return response.data;
  },
};

export default financeiroService;
