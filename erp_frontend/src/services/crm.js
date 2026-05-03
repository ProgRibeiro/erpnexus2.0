import api from "./api";

const unwrap = (data) => data.results ?? data;

const crmService = {
  // Pipelines
  listarPipelines: async () => {
    const response = await api.get("/crm/pipelines/");
    return unwrap(response.data);
  },

  criarPipeline: async (payload) => {
    const response = await api.post("/crm/pipelines/", payload);
    return response.data;
  },

  // Kanban e Oportunidades
  obterKanban: async (pipelineId, filtros = {}) => {
    const response = await api.get(`/crm/kanban/${pipelineId}/`, { params: filtros });
    return response.data;
  },

  listarOportunidades: async (filtros = {}) => {
    const response = await api.get("/crm/oportunidades/", { params: filtros });
    return unwrap(response.data);
  },

  obterOportunidade: async (id) => {
    const response = await api.get(`/crm/oportunidades/${id}/`);
    return response.data;
  },

  criarOportunidade: async (payload) => {
    const response = await api.post("/crm/oportunidades/", payload);
    return response.data;
  },

  atualizarOportunidade: async (id, payload) => {
    const response = await api.patch(`/crm/oportunidades/${id}/`, payload);
    return response.data;
  },

  moverOportunidade: async (id, payload) => {
    const response = await api.patch(`/crm/oportunidades/${id}/mover/`, payload);
    return response.data;
  },

  converterOrcamento: async (id) => {
    const response = await api.post(`/crm/oportunidades/${id}/converter-orcamento/`);
    return response.data;
  },

  // Atividades
  criarAtividade: async (payload) => {
    const response = await api.post("/crm/atividades/", payload);
    return response.data;
  },

  atualizarAtividade: async (id, payload) => {
    const response = await api.patch(`/crm/atividades/${id}/`, payload);
    return response.data;
  },

  listarAtividades: async (oportunidadeId) => {
    const response = await api.get(`/crm/oportunidades/${oportunidadeId}/atividades/`);
    return unwrap(response.data);
  },

  // Email e Comunicação
  enviarEmail: async (id, payload) => {
    const response = await api.post(`/crm/oportunidades/${id}/enviar-email/`, payload);
    return response.data;
  },

  listarEmails: async (oportunidadeId) => {
    const response = await api.get(`/crm/oportunidades/${oportunidadeId}/emails/`);
    return unwrap(response.data);
  },

  // Usuários e Filtros
  listarResponsaveis: async () => {
    const response = await api.get("/crm/responsaveis/");
    return unwrap(response.data);
  },

  obterEstatisticas: async (pipelineId) => {
    const response = await api.get(`/crm/pipelines/${pipelineId}/estatisticas/`);
    return response.data;
  },
};

export default crmService;
