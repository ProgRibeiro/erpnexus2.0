import api from "./api";

const ordemService = {
  listar: async () => {
    const response = await api.get("/ordens/");
    return response.data;
  },
};

export default ordemService;
