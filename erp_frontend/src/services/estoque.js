import api from "./api";

const unwrap = (data) => data.results ?? data;

const estoqueService = {
  listarProdutos: async (params) => {
    const response = await api.get("/estoque/produtos/", { params });
    return unwrap(response.data);
  },
  obterProduto: async (id) => {
    const response = await api.get(`/estoque/produtos/${id}/`);
    return response.data;
  },
  salvarProduto: async (payload, id) => {
    const response = id
      ? await api.patch(`/estoque/produtos/${id}/`, payload)
      : await api.post("/estoque/produtos/", payload);
    return response.data;
  },
  listarCategorias: async () => {
    const response = await api.get("/estoque/categorias/");
    return unwrap(response.data);
  },
  salvarCategoria: async (payload, id) => {
    const response = id
      ? await api.patch(`/estoque/categorias/${id}/`, payload)
      : await api.post("/estoque/categorias/", payload);
    return response.data;
  },
  criarMovimentacao: async (payload) => {
    const response = await api.post("/estoque/movimentacoes/", payload);
    return response.data;
  },
  listarMovimentacoes: async (params) => {
    const response = await api.get("/estoque/movimentacoes/", { params });
    return unwrap(response.data);
  },
  dashboard: async () => {
    const response = await api.get("/estoque/dashboard/");
    return response.data;
  },
  relatorio: async (params) => {
    const response = await api.get("/estoque/relatorio/", { params });
    return response.data;
  },
};

export default estoqueService;
