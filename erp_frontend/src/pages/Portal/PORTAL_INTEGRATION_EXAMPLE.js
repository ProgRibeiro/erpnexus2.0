/**
 * Exemplo de integração do Portal do Cliente com React
 * Este arquivo demonstra como integrar os endpoints do portal com uma aplicação React
 */

// ============================================================================
// 1. Serviço API do Portal (services/portalApi.js)
// ============================================================================

import axios from 'axios';

const API_BASE = '/api/v1/portal';

// Cria instância do axios com interceptor para token
const apiClient = axios.create({
  baseURL: API_BASE,
});

// Interceptor para adicionar token em todas as requisições
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('portalToken');
  if (token) {
    config.headers['X-Portal-Token'] = token;
  }
  return config;
});

// Interceptor para tratamento de erros
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('portalToken');
      window.location.href = '/portal/login';
    }
    return Promise.reject(error);
  }
);

// Métodos de autenticação
export const portalApi = {
  // Autenticação
  login: (email, senha) =>
    apiClient.post('/auth/login/', { email, senha }),

  logout: () => {
    localStorage.removeItem('portalToken');
    localStorage.removeItem('clienteId');
  },

  isAuthenticated: () => !!localStorage.getItem('portalToken'),

  // Ordens de Serviço
  minhasOS: () =>
    apiClient.get('/minhas-os/'),

  osDetalhes: (osId) =>
    apiClient.get(`/minhas-os/${osId}/`),

  osRelatorio: (osId) =>
    apiClient.get(`/minhas-os/${osId}/relatorio/`),

  downloadRelatorio: (osId) => {
    const token = localStorage.getItem('portalToken');
    window.open(`/api/v1/portal/minhas-os/${osId}/relatorio/?token=${token}`);
  },

  // Orçamentos
  meusOrcamentos: () =>
    apiClient.get('/meus-orcamentos/'),

  aprovarOrcamento: (orcamentoId) =>
    apiClient.post(`/orcamentos/${orcamentoId}/aprovar/`),

  recusarOrcamento: (orcamentoId, motivo) =>
    apiClient.post(`/orcamentos/${orcamentoId}/recusar/`, { motivo }),

  // Notas Fiscais
  minhasNotas: () =>
    apiClient.get('/minhas-notas/'),
};

// ============================================================================
// 2. Página de Login do Portal (pages/Portal/Login.jsx)
// ============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { portalApi } from '../../services/portalApi';
import './PortalLogin.css';

export function PortalLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const response = await portalApi.login(values.email, values.senha);
      const { token, cliente_id, cliente_nome } = response.data;

      // Armazena token e dados do cliente
      localStorage.setItem('portalToken', token);
      localStorage.setItem('clienteId', cliente_id);
      localStorage.setItem('clienteNome', cliente_nome);

      message.success('Login realizado com sucesso!');
      navigate('/portal/dashboard');
    } catch (error) {
      message.error('Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login-container">
      <Card className="portal-login-card">
        <h1>Portal do Cliente</h1>
        <p>Acesse suas Ordens de Serviço e orçamentos</p>

        <Form onFinish={handleLogin} layout="vertical">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Email obrigatório' },
              { type: 'email', message: 'Email inválido' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="seu@email.com"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="senha"
            rules={[{ required: true, message: 'Senha obrigatória' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Sua senha"
              disabled={loading}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
          >
            Entrar
          </Button>
        </Form>
      </Card>
    </div>
  );
}

// ============================================================================
// 3. Dashboard do Portal (pages/Portal/Dashboard.jsx)
// ============================================================================

import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Empty, Spin, Button, Space, message } from 'antd';
import { FileOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { portalApi } from '../../services/portalApi';

export function PortalDashboard() {
  const [minhasOS, setMinhasOS] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const clienteNome = localStorage.getItem('clienteNome');

  useEffect(() => {
    loadDados();
  }, []);

  const loadDados = async () => {
    setLoading(true);
    try {
      const [osRes, orcRes, notasRes] = await Promise.all([
        portalApi.minhasOS(),
        portalApi.meusOrcamentos(),
        portalApi.minhasNotas(),
      ]);

      setMinhasOS(osRes.data);
      setOrcamentos(orcRes.data);
      setNotas(notasRes.data);
    } catch (error) {
      message.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const statusMap = {
    aberta: { color: 'blue', label: 'Aberta' },
    orcamento: { color: 'orange', label: 'Orçamento' },
    aprovada: { color: 'cyan', label: 'Aprovada' },
    em_execucao: { color: 'processing', label: 'Em execução' },
    concluida: { color: 'success', label: 'Concluída' },
    faturada: { color: 'green', label: 'Faturada' },
    cancelada: { color: 'error', label: 'Cancelada' },
  };

  const osColumns = [
    { title: 'OS', dataIndex: 'numero', key: 'numero' },
    { title: 'Serviço', dataIndex: 'descricao_servico', key: 'descricao_servico' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = statusMap[status] || statusMap.aberta;
        return <Tag color={config.color}>{config.label}</Tag>;
      }
    },
    { title: 'Data agendada', dataIndex: 'data_agendada', key: 'data_agendada' },
    { title: 'Valor', dataIndex: 'valor_total_orcado', key: 'valor', render: (val) => `R$ ${val}` },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Button type="link" onClick={() => window.location.href = `/portal/os/${record.id}`}>
          Ver detalhes
        </Button>
      )
    }
  ];

  const orcamentosColumns = [
    { title: 'OS', dataIndex: 'numero', key: 'numero' },
    { title: 'Descrição', dataIndex: 'descricao_servico', key: 'descricao_servico' },
    { title: 'Valor', dataIndex: 'valor_total_orcado', key: 'valor', render: (val) => `R$ ${val}` },
    { title: 'Validade', dataIndex: 'validade_orcamento', key: 'validade_orcamento' },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleAprovarOrcamento(record.id)}
          >
            Aprovar
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => handleRecusarOrcamento(record.id)}
          >
            Recusar
          </Button>
        </Space>
      )
    }
  ];

  const handleAprovarOrcamento = async (orcamentoId) => {
    try {
      await portalApi.aprovarOrcamento(orcamentoId);
      message.success('Orçamento aprovado com sucesso!');
      loadDados();
    } catch (error) {
      message.error('Erro ao aprovar orçamento');
    }
  };

  const handleRecusarOrcamento = async (orcamentoId) => {
    const motivo = window.prompt('Motivo da recusa:');
    if (motivo) {
      try {
        await portalApi.recusarOrcamento(orcamentoId, motivo);
        message.success('Orçamento recusado com sucesso!');
        loadDados();
      } catch (error) {
        message.error('Erro ao recusar orçamento');
      }
    }
  };

  if (loading) return <Spin />;

  return (
    <div className="portal-dashboard">
      <h1>Bem-vindo, {clienteNome}!</h1>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <div>Minhas OS: <strong>{minhasOS.length}</strong></div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <div>Orçamentos pendentes: <strong>{orcamentos.length}</strong></div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <div>Notas Fiscais: <strong>{notas.length}</strong></div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Minhas Ordens de Serviço">
            {minhasOS.length > 0 ? (
              <Table
                columns={osColumns}
                dataSource={minhasOS}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="Nenhuma OS encontrada" />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Orçamentos Pendentes">
            {orcamentos.length > 0 ? (
              <Table
                columns={orcamentosColumns}
                dataSource={orcamentos}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="Nenhum orçamento pendente" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="Minhas Notas Fiscais">
            {notas.length > 0 ? (
              <Table
                dataSource={notas}
                columns={[
                  { title: 'NF', dataIndex: 'numero_nf', key: 'numero_nf' },
                  { title: 'Valor', dataIndex: 'valor_final_faturado', key: 'valor', render: (val) => `R$ ${val}` },
                  { title: 'Emissão', dataIndex: 'data_emissao_nf', key: 'data_emissao_nf' },
                  { title: 'Vencimento', dataIndex: 'data_vencimento', key: 'data_vencimento' },
                  {
                    title: 'PDF',
                    key: 'pdf',
                    render: (_, record) => record.pdf_nf ? (
                      <a href={record.pdf_nf} target="_blank" rel="noreferrer">
                        <FileOutlined /> Download
                      </a>
                    ) : '-'
                  }
                ]}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="Nenhuma nota fiscal" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// ============================================================================
// 4. Detalhes da OS (pages/Portal/OSDetalhes.jsx)
// ============================================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, Button, Image, Row, Col, Table, Space, message } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { portalApi } from '../../services/portalApi';

export function PortalOSDetalhes() {
  const { osId } = useParams();
  const navigate = useNavigate();
  const [os, setOS] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOS();
  }, [osId]);

  const loadOS = async () => {
    try {
      const response = await portalApi.osDetalhes(osId);
      setOS(response.data);
    } catch (error) {
      message.error('Erro ao carregar OS');
      navigate('/portal/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadRelatorio = async () => {
    try {
      await portalApi.downloadRelatorio(osId);
      message.success('Download iniciado');
    } catch (error) {
      message.error('Erro ao baixar relatório');
    }
  };

  if (loading) return <Spin />;
  if (!os) return <div>OS não encontrada</div>;

  const itensColumns = [
    { title: 'Descrição', dataIndex: 'descricao', key: 'descricao' },
    { title: 'Quantidade', dataIndex: 'quantidade', key: 'quantidade' },
    { title: 'Valor unitário', dataIndex: 'valor_unitario', key: 'valor_unitario', render: (val) => `R$ ${val}` },
    { title: 'Total', dataIndex: 'valor_total', key: 'valor_total', render: (val) => `R$ ${val}` },
  ];

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/portal/dashboard')}
        style={{ marginBottom: 16 }}
      >
        Voltar
      </Button>

      <Card
        title={`OS ${os.numero}`}
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownloadRelatorio}
            type="primary"
          >
            Download Relatório
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <div><strong>Cliente:</strong> {os.cliente_nome}</div>
            <div><strong>Técnico:</strong> {os.tecnico_nome}</div>
            <div><strong>Data:</strong> {os.data_agendada}</div>
          </Col>
          <Col xs={24} sm={12}>
            <div><strong>Endereço:</strong> {os.endereco_servico}</div>
            <div><strong>Tipo:</strong> {os.tipo_servico}</div>
            <div><strong>Prioridade:</strong> {os.prioridade}</div>
          </Col>
        </Row>

        <h3 style={{ marginTop: 24 }}>Descrição do Serviço</h3>
        <p>{os.descricao_servico}</p>

        <h3>Itens</h3>
        <Table
          columns={itensColumns}
          dataSource={os.itens}
          pagination={false}
          size="small"
        />

        <h3 style={{ marginTop: 24 }}>Observações Técnicas</h3>
        <p>{os.observacoes_tecnicas}</p>

        <h3>Fotos - Antes</h3>
        {os.fotos_antes.length > 0 ? (
          <Image.PreviewGroup>
            <Row gutter={[10, 10]}>
              {os.fotos_antes.map((foto) => (
                <Col xs={12} sm={8} lg={4} key={foto.id}>
                  <Image
                    src={foto.arquivo}
                    alt={foto.legenda}
                    style={{ width: '100%' }}
                  />
                </Col>
              ))}
            </Row>
          </Image.PreviewGroup>
        ) : (
          <p>Sem fotos</p>
        )}

        <h3>Fotos - Depois</h3>
        {os.fotos_depois.length > 0 ? (
          <Image.PreviewGroup>
            <Row gutter={[10, 10]}>
              {os.fotos_depois.map((foto) => (
                <Col xs={12} sm={8} lg={4} key={foto.id}>
                  <Image
                    src={foto.arquivo}
                    alt={foto.legenda}
                    style={{ width: '100%' }}
                  />
                </Col>
              ))}
            </Row>
          </Image.PreviewGroup>
        ) : (
          <p>Sem fotos</p>
        )}

        <h3 style={{ marginTop: 24 }}>Informações de Pagamento</h3>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card>
              <div><strong>Valor:</strong> R$ {os.valor_final_faturado}</div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <div><strong>NF:</strong> {os.numero_nf || 'Pendente'}</div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <div><strong>Pagamento:</strong> {os.status_pagamento}</div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

// ============================================================================
// 5. Roteamento (exemplo de routes no App.jsx)
// ============================================================================

import { PortalLogin } from './pages/Portal/Login';
import { PortalDashboard } from './pages/Portal/Dashboard';
import { PortalOSDetalhes } from './pages/Portal/OSDetalhes';

// Protetor de rotas autenticadas do portal
function PortalPrivateRoute({ children }) {
  return portalApi.isAuthenticated() ? children : <Navigate to="/portal/login" />;
}

export const portalRoutes = [
  {
    path: '/portal/login',
    element: <PortalLogin />,
  },
  {
    path: '/portal/dashboard',
    element: <PortalPrivateRoute><PortalDashboard /></PortalPrivateRoute>,
  },
  {
    path: '/portal/os/:osId',
    element: <PortalPrivateRoute><PortalOSDetalhes /></PortalPrivateRoute>,
  },
];

// No App.jsx, adicione as rotas:
// <Route path="/portal/*" element={<PortalLayout />}>
//   {portalRoutes}
// </Route>
