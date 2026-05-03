import api from "./api";

const agendaService = {
  /**
   * Busca agenda de OS por período
   * @param {string} dataInicio - Data de início (YYYY-MM-DD)
   * @param {string} dataFim - Data de fim (YYYY-MM-DD)
   * @param {string} tecnico - ID do técnico (opcional)
   * @param {string} tipoServico - Tipo de serviço (opcional)
   * @returns {Promise} Array de datas com técnicos e suas OS
   */
  listarPorPeriodo: async (dataInicio, dataFim, tecnico = null, tipoServico = null) => {
    const params = {
      data_inicio: dataInicio,
      data_fim: dataFim,
    };
    if (tecnico) params.tecnico = tecnico;
    if (tipoServico) params.tipo_servico = tipoServico;

    const response = await api.get("/ordens/agenda/", { params });
    return response.data;
  },

  /**
   * Busca agenda de hoje
   * @returns {Promise} Array de OS agendadas para hoje
   */
  agendaHoje: async () => {
    const response = await api.get("/ordens/agenda/hoje/");
    return response.data.results ?? response.data;
  },

  /**
   * Reagenda uma OS
   * @param {number} id - ID da OS
   * @param {object} payload - { data_agendada, hora_inicio?, tecnico_responsavel? }
   * @returns {Promise} OS reagendada
   */
  reagendar: async (id, payload) => {
    const response = await api.patch(`/ordens/${id}/reagendar/`, payload);
    return response.data;
  },

  /**
   * Reagenda via drag and drop
   * @param {number} id - ID da OS
   * @param {string} novaData - Nova data (YYYY-MM-DD)
   * @param {string} novaHora - Nova hora (HH:MM) opcional
   * @returns {Promise} OS reagendada
   */
  reagendarDragDrop: async (id, novaData, novaHora = null) => {
    const payload = {
      data_agendada: novaData,
    };
    if (novaHora) {
      payload.hora_inicio = novaHora;
    }
    return agendaService.reagendar(id, payload);
  },
};

export default agendaService;
