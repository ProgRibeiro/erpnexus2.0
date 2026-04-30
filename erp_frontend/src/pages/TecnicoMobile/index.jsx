import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Empty, Space, Tag, Badge, Spin, message } from 'antd';
import { EnvironmentOutlined, PhoneOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useIsMobile } from '../../hooks/useIsMobile';
import PageContainer from '../../components/PageContainer';
import './TecnicoMobile.css';

export default function TecnicoMobile() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [ordensHoje, setOrdensHoje] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(true);
      const hoje = new Date().toISOString().split('T')[0];
      const response = await api.get(`/api/v1/ordens/?data_agendado=${hoje}`);
      setOrdensHoje(response.data.results || []);
    } catch (error) {
      console.error('Erro ao carregar ordens:', error);
      message.error('Erro ao carregar ordens do dia');
    } finally {
      setLoading(false);
    }
  };

  const abrirGoogleMaps = (endereco) => {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(endereco)}`;
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
        <h1>Ordens do Dia</h1>

        {ordensHoje.length === 0 ? (
          <Empty description="Nenhuma ordem agendada para hoje" />
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
                    <Tag color={getStatusColor(ordem.status)}>
                      {getStatusLabel(ordem.status)}
                    </Tag>
                  </div>
                  <Badge count={ordem.fotos?.length || 0} style={{ backgroundColor: '#1B4F8A' }} />
                </div>

                <div className="ordem-details">
                  <div className="detail-item">
                    <UserOutlined />
                    <span>{ordem.cliente?.nome || 'Cliente desconhecido'}</span>
                  </div>

                  <div className="detail-item">
                    <EnvironmentOutlined />
                    <span>{ordem.local || 'Sem localização'}</span>
                  </div>

                  <div className="detail-item">
                    <PhoneOutlined />
                    <span>{ordem.cliente?.telefone || '-'}</span>
                  </div>

                  <div className="detail-item">
                    <ClockCircleOutlined />
                    <span>{new Date(ordem.data_agendado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="ordem-servicos">
                  <small><strong>Serviços:</strong> {ordem.servicos?.length || 0}</small>
                </div>

                <Space style={{ width: '100%', marginTop: '12px' }}>
                  <Button
                    type="primary"
                    block
                    onClick={(e) => {
                      e.stopPropagation();
                      entrarEmModoOSCampo(ordem);
                    }}
                  >
                    Iniciar OS
                  </Button>
                  <Button
                    type="default"
                    block
                    icon={<EnvironmentOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirGoogleMaps(ordem.local);
                    }}
                  >
                    Como chegar
                  </Button>
                </Space>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
