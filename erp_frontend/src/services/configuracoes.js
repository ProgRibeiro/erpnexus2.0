import api from "./api";

function buildEmpresaFormData(payload = {}) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (key === "logo") {
      if (value instanceof File || value instanceof Blob) {
        formData.append("logo", value);
      }
      return;
    }

    formData.append(key, value);
  });

  return formData;
}

const configuracoesService = {
  // Empresa
  obterEmpresa: async () => {
    const response = await api.get("/configuracoes/empresa/");
    return response.data;
  },
  salvarEmpresa: async (payload) => {
    const formData = buildEmpresaFormData(payload);
    const response = await api.patch("/configuracoes/empresa/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Notificações
  listarNotificacoes: async () => {
    const response = await api.get("/configuracoes/notificacoes/");
    return response.data;
  },
  salvarNotificacoes: async (itens) => {
    const response = await api.patch("/configuracoes/notificacoes/", { itens });
    return response.data;
  },

  // Ordens de Serviço
  obterConfiguracacaoOS: async () => {
    const response = await api.get("/configuracoes/os/");
    return response.data;
  },
  salvarConfiguracaoOS: async (payload) => {
    const response = await api.patch("/configuracoes/os/", payload);
    return response.data;
  },

  // Financeira
  obterConfiguracaoFinanceira: async () => {
    const response = await api.get("/configuracoes/financeira/");
    return response.data;
  },
  salvarConfiguracaoFinanceira: async (payload) => {
    const response = await api.patch("/configuracoes/financeira/", payload);
    return response.data;
  },

  // Métodos auxiliares mantidos
  consultarCNPJ: async (cnpj) => {
    try {
      const response = await api.get(`/fiscal/consultar-cnpj/${cnpj}/`);
      return response.data;
    } catch {
      return null;
    }
  },

  calcularImpostos: async (dados) => {
    try {
      const response = await api.post("/fiscal/calcular-impostos/", dados);
      return response.data;
    } catch {
      return null;
    }
  },

  obterConfigFiscal: async () => {
    try {
      const response = await api.get("/fiscal/configuracao/");
      return response.data;
    } catch {
      return null;
    }
  },

  salvarConfigFiscal: async (payload) => {
    try {
      const response = await api.patch("/fiscal/configuracao/", payload);
      return response.data;
    } catch {
      return null;
    }
  },

  // Logos de clientes/parceiros de referência
  listarLogosClientes: async () => {
    const response = await api.get("/configuracoes/logos-clientes/");
    return response.data;
  },
  criarLogoCliente: async (nome, arquivoFile) => {
    const formData = new FormData();
    formData.append("nome", nome);
    formData.append("logo", arquivoFile);
    const response = await api.post(
      "/configuracoes/logos-clientes/",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },
  editarLogoCliente: async (id, payload) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) formData.append(k, v);
    });
    const response = await api.patch(
      `/configuracoes/logos-clientes/${id}/`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },
  excluirLogoCliente: async (id) => {
    await api.delete(`/configuracoes/logos-clientes/${id}/`);
  },
};

export default configuracoesService;
