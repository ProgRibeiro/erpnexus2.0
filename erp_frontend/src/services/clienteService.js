import api from "./api";

const clienteService = {
  listar: async () => {
    const response = await api.get("/clientes/");
    return response.data;
  },
};

export default clienteService;
