import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Empty, Space, Tag, Badge, Spin, message } from 'antd';
import { EnvironmentOutlined, PhoneOutlined, UserOutlined, ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useIndexedDB } from '../../hooks/useIndexedDB';
import PageContainer from '../../components/PageContainer';
import './TecnicoMobile.css';

export default function TecnicoMobile() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isReady, cacheOS, getCachedOS } = useIndexedDB();
  const [ordensHoje, setOrdensHoje] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      navigate('/dashboard');
      return;
    }

    carregarOrdensHoje();
    const interval = setInterval(carregarOrdensHoje, 30000);
    return () => clearInterval(interval);
  }, [isMobile, navigate]);

  const carregarOrdensHoje = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const response = await api.get(`/api/v1/ordens/?data_agendado=${hoje}`);
      const ordens = response.data.results || [];

      setOrdensHoje(ordens);

      // Cache das ordens
      if (isReady) {
        ordens.forEach(ordem => {
          cacheOS(ordem);
        });
      }
    } catch (error) {
      console.error('Erro ao carregar ordens:', error);

      // Tentar carregar do cache se offline
      if (navigator.onLine === false) {
        message.info('Carregando ordens do cache (offline)');
        // Mostrar ordens em cache
      } else {
        message.error('Erro ao carregar ordens do dia');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await carregarOrdensHoje();
  };

  const abrirGoogleMaps = (endereco) => {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
  };

  const abrirNavegacao = (endereco) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
  };

  const entrarEmModoOSCampo = (ordem) => {
    navigate(`/tecnico-mobile/os-campo/${ordem.id}`, { state: { ordem } });
  };

  const getStatusColor = (status) => {
    const colors = {
      pendente: 'default',
      em_progresso: 'processing',
      concluida: 'success',
      cancelada: 'error',
      agendada: 'blue'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pendente: 'Pendente',
      em_progresso: 'Em Progresso',
      concluida: 'Concluída',
      cancelada: 'Cancelada',
      agendada: 'Agendada'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex-center" style={{ height: '100vh' }}>
          <Spin size="large" tip="Carregando ordens..." />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="tecnico-mobile-container">
        <div className="tecnico-header">
          <h1>Minhas OS de Hoje</h1>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={refreshing}
            className="btn-refresh"
          />
        </div>

        {ordensHoje.length === 0 ? (
          <Empty description="Nenhuma ordem agendada para hoje" style={{ marginTop: '40px' }} />
        ) : (
          <div className="ordens-list">
            {ordensHoje.map((ordem) => (
              <Card
                key={ordem.id}
                className="ordem-card"
                hoverable
                onClick={() => entrarEmModoOSCampo(ordem)}
              >
                <div className="ordem-header">
                  <div className="ordem-title">
                    <h3>OS #{ordem.numero}</h3>
                    <Tag color={getStatusColor(ordem.status)} className="status-badge">
                      {getStatusLabel(ordem.status)}
                    </Tag>
                  </div>
                  {ordem.fotos?.length > 0 && (
                    <Badge
                      count={ordem.fotos.length}
                      style={{ backgroundColor: '#1B4F8A' }}
                      className="fotos-badge"
                    />
                  )}
                </div>

                <div className="ordem-details">
                  <div className="detail-item">
                    <UserOutlined className="detail-icon" />
                    <span className="detail-text">{ordem.cliente?.nome || 'Cliente desconhecido'}</span>
                  </div>

                  <div className="detail-item">
                    <EnvironmentOutlined className="detail-icon" />
                    <span className="detail-text">{ordem.local || 'Sem localização'}</span>
                  </div>

                  <div className="detail-item">
                    <PhoneOutlined className="detail-icon" />
                    <span className="detail-text">{ordem.cliente?.telefone || '-'}</span>
                  </div>

                  <div className="detail-item">
                    <ClockCircleOutlined className="detail-icon" />
                    <span className="detail-text">
                      {new Date(ordem.data_agendado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="ordem-servicos">
                  <small><strong>Serviços:</strong> {ordem.servicos?.length || 0}</small>
                </div>

                <Space style={{ width: '100%', marginTop: '16px', gap: '8px' }} direction="vertical">
                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={(e) => {
                      e.stopPropagation();
                      entrarEmModoOSCampo(ordem);
                    }}
                    className="btn-iniciar"
                  >
                    Iniciar Atendimento
                  </Button>

                  <Space style={{ width: '100%' }}>
                    <Button
                      size="large"
                      icon={<EnvironmentOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirGoogleMaps(ordem.local);
                      }}
                      className="btn-mapa"
                    >
                      Ver Endereço
                    </Button>

                    <Button
                      size="large"
                      icon={<EnvironmentOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirNavegacao(ordem.local);
                      }}
                      className="btn-navegacao"
                    >
                      Navegar
                    </Button>
                  </Space>
                </Space>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
