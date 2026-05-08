import api from "./api";

const unwrap = (data) => data.results ?? data;
const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

function normalizeClientePayload(payload = {}) {
  return {
    ...payload,
    tipo_pessoa: payload.tipo_pessoa || "juridica",
    nome: payload.nome || payload.nome_fantasia || payload.razao_social || "",
    cnpj_cpf: onlyDigits(payload.cnpj_cpf),
    cnpj_principal_grupo: onlyDigits(payload.cnpj_principal_grupo),
    telefone: payload.telefone || "",
    whatsapp: payload.whatsapp || "",
    cep: payload.cep || "",
    uf: String(payload.uf || "").toUpperCase(),
    status: payload.status || "ativo",
  };
}

const clienteService = {
  listar: async (params) => {
    const response = await api.get("/clientes/", { params });
    const items = unwrap(response.data);
    if (Array.isArray(items)) {
      Object.defineProperty(items, "meta", {
        value: {
          count: response.data?.count ?? items.length,
          next: response.data?.next ?? null,
          previous: response.data?.previous ?? null,
        },
        enumerable: false,
      });
    }
    return items;
  },

  criar: async (payload) => {
    const response = await api.post("/clientes/", normalizeClientePayload(payload));
    return response.data;
  },

  atualizar: async (id, payload) => {
    const response = await api.patch(`/clientes/${id}/`, normalizeClientePayload(payload));
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
    const response = await api.post("/fiscal/consultar-cnpj/", { cnpj: onlyDigits(cnpj) });
    return response.data;
  },
};

export default clienteService;
