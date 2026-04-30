import api from "./api";

const unwrap = (data) => data.results ?? data;

const crmService = {
  listarPipelines: async () => {
    const response = await api.get("/crm/pipelines/");
    return unwrap(response.data);
  },
  obterKanban: async (pipelineId) => {
    const response = await api.get(`/crm/kanban/${pipelineId}/`);
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
  criarAtividade: async (payload) => {
    const response = await api.post("/crm/atividades/", payload);
    return response.data;
  },
  atualizarAtividade: async (id, payload) => {
    const response = await api.patch(`/crm/atividades/${id}/`, payload);
    return response.data;
  },
  enviarEmail: async (id, payload) => {
    const response = await api.post(`/crm/oportunidades/${id}/enviar-email/`, payload);
    return response.data;
  },
};

export default crmService;
