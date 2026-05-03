import api from "./api";

const ordemService = {
  listar: async () => {
    const response = await api.get("/ordens/");
    return response.data;
  },

  /**
   * @deprecated Use agendaService.listarPorPeriodo() instead
   */
  agenda: async (params) => {
    const response = await api.get("/ordens/agenda/", { params });
    return response.data;
  },

  /**
   * @deprecated Use agendaService.agendaHoje() instead
   */
  agendaHoje: async () => {
    const response = await api.get("/ordens/agenda/hoje/");
    return response.data;
  },

  /**
   * @deprecated Use agendaService.reagendar() instead
   */
  reagendar: async (id, payload) => {
    const response = await api.patch(`/ordens/${id}/reagendar/`, payload);
    return response.data;
  },

  relatorioPublico: async (token) => {
    const response = await api.get(`/publico/relatorio/${token}/`);
    return response.data;
  },
};

export default ordemService;
