import api from './api';

const unwrap = (data) => data.results ?? data;

export default {
  listar: async (params) => {
    const response = await api.get('/estoque/servicos/', { params });
    return unwrap(response.data);
  },

  criar: async (payload) => {
    const response = await api.post('/estoque/servicos/', payload);
    return response.data;
  },

  atualizar: async (id, payload) => {
    const response = await api.patch(`/estoque/servicos/${id}/`, payload);
    return response.data;
  },

  obter: async (id) => {
    const response = await api.get(`/estoque/servicos/${id}/`);
    return response.data;
  },

  deletar: async (id) => {
    await api.delete(`/estoque/servicos/${id}/`);
  },
};
