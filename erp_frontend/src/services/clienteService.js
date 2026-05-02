import api from "./api";

const unwrap = (data) => data.results ?? data;

const clienteService = {
  listar: async (params) => {
    const response = await api.get("/clientes/", { params });
    return unwrap(response.data);
  },

  criar: async (payload) => {
    const response = await api.post("/clientes/", payload);
    return response.data;
  },

  atualizar: async (id, payload) => {
    const response = await api.patch(`/clientes/${id}/`, payload);
    return response.data;
  },

  obter: async (id) => {
    const response = await api.get(`/clientes/${id}/`);
    return response.data;
  },

  deletar: async (id) => {
    await api.delete(`/clientes/${id}/`);
  },

  consultarCNPJ: async (cnpj) => {
    const response = await api.post("/fiscal/consultar-cnpj/", { cnpj });
    return response.data;
  },
};

export default clienteService;
