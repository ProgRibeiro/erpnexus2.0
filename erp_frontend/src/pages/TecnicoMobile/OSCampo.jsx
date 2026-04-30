import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button, Input, Image, Space, Modal, message, Divider, Tag, Empty, Spin } from 'antd';
import { CameraOutlined, CheckCircleOutlined, FileTextOutlined, SendOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useOffline } from '../../hooks/useOffline';
import PageContainer from '../../components/PageContainer';
import './TecnicoMobile.css';

export default function OSCampo() {
  const navigate = useNavigate();
  const { osId } = useParams();
  const location = useLocation();
  const ordem = location.state?.ordem;
  const { isOffline, savePhotoOffline, addPendingSync } = useOffline();

  const [ordem_data, setOrdemData] = useState(ordem);
  const [fotos, setFotos] = useState([]);
  const [laudo, setLaudo] = useState('');
  const [chat, setChat] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrandoChegada, setRegistrandoChegada] = useState(false);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    if (!ordem_data) {
      carregarOrdem();
    }
    carregarChat();
  }, [osId]);

  const carregarOrdem = async () => {
    try {
      const response = await api.get(`/api/v1/ordens/${osId}/`);
      setOrdemData(response.data);
      setFotos(response.data.fotos || []);
      setLaudo(response.data.laudo || '');
    } catch (error) {
      console.error('Erro ao carregar ordem:', error);
      message.error('Erro ao carregar ordem');
    }
  };

  const carregarChat = async () => {
    try {
      const response = await api.get(`/api/v1/ordens/${osId}/mensagens/`);
      setChat(response.data.results || []);
    } catch (error) {
      console.log('Erro ao carregar chat:', error);
    }
  };

  const registrarChegada = async () => {
    try {
      setRegistrandoChegada(true);
      const now = new Date().toISOString();

      if (isOffline) {
        addPendingSync('registrar_chegada', { osId, chegada_em: now });
        message.success('Chegada registrada (sincronizará quando online)');
      } else {
        await api.patch(`/api/v1/ordens/${osId}/`, {
          status: 'em_progresso',
          chegada_em: now
        });
        message.success('Chegada registrada!');
        setOrdemData({ ...ordem_data, status: 'em_progresso', chegada_em: now });
      }
    } catch (error) {
      message.error('Erro ao registrar chegada');
    } finally {
      setRegistrandoChegada(false);
    }
  };

  const tirarFoto = async (tipo) => {
    const fileInput = fileInputRef.current;
    fileInput.click();

    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const photoData = event.target.result;

          if (isOffline) {
            savePhotoOffline(photoData, { tipo, osId });
            message.success('Foto salva offline');
          } else {
            const formData = new FormData();
            formData.append('foto', file);
            formData.append('tipo', tipo);

            const response = await api.post(`/api/v1/ordens/${osId}/fotos/`, formData);
            setFotos([...fotos, response.data]);
            message.success('Foto enviada!');
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        message.error('Erro ao processar foto');
      }
    };
  };

  const finalizar = async () => {
    Modal.confirm({
      title: 'Finalizar Serviço',
      content: 'Tem certeza que deseja finalizar este serviço?',
      okText: 'Sim',
      cancelText: 'Não',
      onOk: async () => {
        try {
          setLoading(true);
          const concluido_em = new Date().toISOString();

          if (isOffline) {
            addPendingSync('finalizar_os', {
              osId,
              laudo,
              fotos: fotos.map(f => f.id),
              concluido_em
            });
            message.success('OS finalizada (sincronizará quando online)');
          } else {
            await api.patch(`/api/v1/ordens/${osId}/`, {
              status: 'concluida',
              laudo,
              concluido_em
            });
            message.success('Serviço finalizado!');
          }

          setTimeout(() => navigate('/tecnico-mobile'), 1500);
        } catch (error) {
          message.error('Erro ao finalizar serviço');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const enviarMensagem = async () => {
    if (!mensagem.trim()) return;

    try {
      await api.post(`/api/v1/ordens/${osId}/mensagens/`, {
        conteudo: mensagem
      });
      setMensagem('');
      carregarChat();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  if (!ordem_data) {
    return (
      <PageContainer>
        <div className="flex-center" style={{ height: '100vh' }}>
          <Spin />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="os-campo-container">
        <div className="os-header">
          <h2>OS #{ordem_data.numero}</h2>
          <Tag color="blue">{ordem_data.cliente?.nome}</Tag>
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div className="action-buttons">
            <Button
              type="primary"
              size="large"
              block
              disabled={ordem_data.status === 'em_progresso'}
              loading={registrandoChegada}
              onClick={registrarChegada}
            >
              ✓ Registrar Chegada
            </Button>
          </div>

          <Divider>Fotos</Divider>

          <div className="photos-section">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="default"
                size="large"
                icon={<CameraOutlined />}
                block
                onClick={() => tirarFoto('antes')}
              >
                📷 Tirar Foto ANTES
              </Button>

              <Button
                type="default"
                size="large"
                icon={<CameraOutlined />}
                block
                onClick={() => tirarFoto('depois')}
              >
                📷 Tirar Foto DEPOIS
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
              />

              {fotos.length > 0 && (
                <div className="photos-grid">
                  {fotos.map((foto, idx) => (
                    <div key={idx} className="photo-item">
                      <Image
                        src={typeof foto === 'string' ? foto : foto.foto}
                        alt={`Foto ${idx}`}
                        width="100%"
                      />
                    </div>
                  ))}
                </div>
              )}
            </Space>
          </div>

          <Divider>Laudo</Divider>

          <Input.TextArea
            rows={4}
            placeholder="Digite o laudo do serviço..."
            value={laudo}
            onChange={(e) => setLaudo(e.target.value)}
            className="laudo-input"
          />

          <Divider>Chat Interno</Divider>

          <div className="chat-section">
            {chat.length === 0 ? (
              <Empty description="Sem mensagens" />
            ) : (
              <div className="chat-messages">
                {chat.map((msg, idx) => (
                  <div key={idx} className="chat-message">
                    <strong>{msg.usuario?.nome}</strong>
                    <p>{msg.conteudo}</p>
                    <small>{new Date(msg.criado_em).toLocaleString('pt-BR')}</small>
                  </div>
                ))}
              </div>
            )}

            <div className="chat-input">
              <Input.TextArea
                rows={2}
                placeholder="Enviar mensagem..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') {
                    enviarMensagem();
                  }
                }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={enviarMensagem}
                style={{ marginTop: '8px' }}
              >
                Enviar
              </Button>
            </div>
          </div>

          <Button
            type="primary"
            danger
            size="large"
            block
            icon={<CheckCircleOutlined />}
            onClick={finalizar}
            loading={loading}
          >
            ✓ Finalizar Serviço
          </Button>
        </Space>

        {isOffline && (
          <div className="offline-banner">
            📶 Você está offline. Os dados serão sincronizados quando voltar online.
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <video ref={videoRef} style={{ display: 'none' }} />
      </div>
    </PageContainer>
  );
}
