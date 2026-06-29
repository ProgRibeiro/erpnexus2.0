import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button, Input, Image, Space, Modal, message, Tag, Empty, Spin, Row, Col } from 'antd';
import { CameraOutlined, CheckCircleOutlined, FileTextOutlined, SendOutlined, DeleteOutlined, EditOutlined, ClockCircleOutlined, CopyOutlined, EnvironmentOutlined, MessageOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useOffline } from '../../hooks/useOffline';
import { useIndexedDB } from '../../hooks/useIndexedDB';
import { useSyncManager } from '../../hooks/useSyncManager';
import { useBackgroundSync } from '../../hooks/useBackgroundSync';
import SignatureCanvas from '../../components/SignatureCanvas';
import PageContainer from '../../components/PageContainer';
import './TecnicoMobile.css';

export default function OSCampo() {
  const navigate = useNavigate();
  const { osId } = useParams();
  const location = useLocation();
  const ordem = location.state?.ordem;
  const { isOffline } = useOffline();
  const { isReady, saveFotoOffline, getOffllineFotos, addToSyncQueue, cacheOS } = useIndexedDB();
  const { syncFotos, syncPendingActions } = useSyncManager();

  const [ordem_data, setOrdemData] = useState(ordem);
  const [fotos, setFotos] = useState([]);
  const [laudo, setLaudo] = useState('');
  const [chat, setChat] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrandoChegada, setRegistrandoChegada] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [assinatura, setAssinatura] = useState(null);
  const [horarioChegada, setHorarioChegada] = useState(null);
  const [horarioConclusao, setHorarioConclusao] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!ordem_data) {
      carregarOrdem();
    } else {
      setLaudo(ordem_data.laudo || '');
    }
    carregarChat();
    carregarFotosOffline();
  }, [osId]);

  // Sincronizar quando voltar online
  useEffect(() => {
    const handleOnline = async () => {
      if (isReady && fotos.length > 0) {
        message.info('Sincronizando fotos...');
        await syncFotos(osId);
      }
      await syncPendingActions();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isReady, fotos, osId, syncFotos, syncPendingActions]);

  const carregarOrdem = async () => {
    try {
      const response = await api.get(`/api/v1/ordens/${osId}/`);
      const data = response.data;
      setOrdemData(data);
      setLaudo(data.laudo || '');
      setFotos(data.fotos || []);
      setHorarioChegada(data.hora_inicio);
      setHorarioConclusao(data.hora_conclusao);
      setAssinatura(data.assinatura_cliente);

      if (isReady) {
        cacheOS(data);
      }
    } catch (error) {
      console.error('Erro ao carregar ordem:', error);
      message.error('Erro ao carregar ordem');
    }
  };

  const carregarFotosOffline = async () => {
    if (isReady) {
      const fotosOffline = await getOffllineFotos(osId);
      if (fotosOffline.length > 0) {
        setFotos(prev => [...prev, ...fotosOffline]);
      }
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

  // Sincronização em background
  useBackgroundSync(osId, 30000);

  const registrarChegada = async () => {
    try {
      setRegistrandoChegada(true);
      const chegadaEm = new Date().toISOString();
      setHorarioChegada(chegadaEm);

      if (isOffline) {
        await addToSyncQueue(osId, 'registrar_chegada', { chegada_em: chegadaEm });
        message.success('Chegada registrada (sincronizará quando online)');
      } else {
        await api.patch(`/api/v1/ordens/${osId}/`, {
          status: 'em_progresso',
          hora_inicio: chegadaEm
        });
        message.success('Chegada registrada!');
      }

      setOrdemData({ ...ordem_data, status: 'em_progresso', hora_inicio: chegadaEm });
    } catch (error) {
      message.error('Erro ao registrar chegada');
    } finally {
      setRegistrandoChegada(false);
    }
  };

  const tirarFoto = async (tipo) => {
    const fileInput = fileInputRef.current;
    fileInput.setAttribute('capture', 'environment');
    fileInput.click();

    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const photoData = event.target.result;
          const foto = {
            id: `photo-${Date.now()}`,
            data: photoData,
            tipo,
            timestamp: Date.now(),
            synced: false
          };

          if (isOffline) {
            if (isReady) {
              await saveFotoOffline(osId, photoData, tipo);
            }
            setFotos(prev => [...prev, foto]);
            message.success(`Foto ${tipo} salva offline`);
          } else {
            const formData = new FormData();
            formData.append('foto', file);
            formData.append('tipo', tipo);

            const response = await api.post(`/api/v1/ordens/${osId}/fotos/`, formData);
            setFotos(prev => [...prev, response.data]);
            message.success('Foto enviada!');
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        message.error('Erro ao processar foto');
      }
    };
  };

  const deletarFoto = (index) => {
    const novasFotos = fotos.filter((_, i) => i !== index);
    setFotos(novasFotos);
    message.success('Foto removida');
  };

  const salvarAssinatura = async (signatureData) => {
    setAssinatura(signatureData);
    setShowSignature(false);
    message.success('Assinatura registrada!');
  };

  const finalizar = async () => {
    if (!assinatura) {
      message.warning('Por favor, obtenha a assinatura do cliente antes de finalizar');
      return;
    }

    Modal.confirm({
      title: 'Finalizar Serviço',
      content: 'Tem certeza que deseja finalizar este serviço? Esta ação não pode ser desfeita.',
      okText: 'Sim, Finalizar',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setLoading(true);
          const concluidoEm = new Date().toISOString();
          setHorarioConclusao(concluidoEm);

          const dados = {
            status: 'concluida',
            laudo,
            hora_conclusao: concluidoEm,
            assinatura_cliente: assinatura
          };

          if (isOffline) {
            await addToSyncQueue(osId, 'finalizar_os', dados);
            message.success('OS finalizada (sincronizará quando online)');
          } else {
            await api.patch(`/api/v1/ordens/${osId}/`, dados);

            // Sincronizar fotos se ainda houver
            if (fotos.length > 0) {
              await syncFotos(osId);
            }

            message.success('Serviço finalizado com sucesso!');
          }

          setTimeout(() => navigate('/tecnico-mobile'), 1500);
        } catch (error) {
          console.error('Erro ao finalizar:', error);
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
      if (isOffline) {
        await addToSyncQueue(osId, 'enviar_mensagem', { conteudo: mensagem });
        message.success('Mensagem enfileirada (será enviada quando online)');
      } else {
        await api.post(`/api/v1/ordens/${osId}/mensagens/`, {
          conteudo: mensagem
        });
        message.success('Mensagem enviada!');
      }

      setMensagem('');
      carregarChat();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      message.error('Erro ao enviar mensagem');
    }
  };

  const copiarNumeroOS = () => {
    navigator.clipboard.writeText(ordem_data.numero);
    message.success('Número OS copiado!');
  };

  const formatarHora = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!ordem_data) {
    return (
      <PageContainer>
        <div className="flex-center" style={{ height: '100vh', background: '#F8FAFD' }}>
          <Spin size="large" tip="Carregando ordem..." />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="os-campo-container">
        {/* Header da OS */}
        <div className="os-header">
          <div className="os-number">
            <h2>OS #{ordem_data.numero}</h2>
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={copiarNumeroOS}
              className="btn-copy"
            />
          </div>
          <Tag color="blue" className="client-tag">{ordem_data.cliente?.nome}</Tag>
          <div className="os-endereco">
            <EnvironmentOutlined className="icon-endereco" />
            <span>{ordem_data.local || 'Sem localização'}</span>
          </div>
        </div>

        {/* Timeline de Horários */}
        <div className="timeline-section">
          <Row gutter={12}>
            <Col xs={12} className="timeline-item">
              <ClockCircleOutlined className="icon-timeline" />
              <span className="label-timeline">Chegada</span>
              <span className="hora-timeline">{formatarHora(horarioChegada)}</span>
            </Col>
            <Col xs={12} className="timeline-item">
              <ClockCircleOutlined className="icon-timeline" />
              <span className="label-timeline">Conclusão</span>
              <span className="hora-timeline">{formatarHora(horarioConclusao)}</span>
            </Col>
          </Row>
        </div>

        {/* Status */}
        <div className="status-section">
          <Tag color={ordem_data.status === 'concluida' ? 'success' : 'processing'} className="status-tag">
            {ordem_data.status === 'em_progresso' ? 'Em Atendimento' : 'Concluída'}
          </Tag>
          {isOffline && <Tag color="warning">OFFLINE</Tag>}
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Botão Registrar Chegada */}
          {!horarioChegada && (
            <Button
              type="primary"
              size="large"
              block
              loading={registrandoChegada}
              onClick={registrarChegada}
              className="btn-acao-grande"
            >
              Registrar Chegada
            </Button>
          )}

          {/* Fotos */}
          <div className="section-fotos">
            <h3 className="section-title"><CameraOutlined /> Fotos do Atendimento</h3>

            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Button
                type="default"
                size="large"
                icon={<CameraOutlined />}
                block
                onClick={() => tirarFoto('antes')}
                className="btn-foto"
              >
                Foto ANTES do atendimento
              </Button>

              <Button
                type="default"
                size="large"
                icon={<CameraOutlined />}
                block
                onClick={() => tirarFoto('depois')}
                className="btn-foto"
              >
                Foto DEPOIS do atendimento
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
              />

              {fotos.length > 0 && (
                <div className="photos-grid">
                  {fotos.map((foto, idx) => (
                    <div key={idx} className="photo-container">
                      <Image
                        src={typeof foto === 'string' ? foto : (foto.foto || foto.data)}
                        alt={`Foto ${idx}`}
                        width="100%"
                        className="photo-item"
                      />
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => deletarFoto(idx)}
                        className="btn-delete-foto"
                      />
                    </div>
                  ))}
                </div>
              )}
            </Space>
          </div>

          {/* Laudo */}
          <div className="section-laudo">
            <h3 className="section-title"><FileTextOutlined /> Laudo do Atendimento</h3>

            <Input.TextArea
              rows={5}
              placeholder="Descreva os detalhes do atendimento, problemas encontrados, soluções aplicadas..."
              value={laudo}
              onChange={(e) => setLaudo(e.target.value)}
              className="laudo-input"
              maxLength={2000}
            />
            <small className="char-count">{laudo.length}/2000 caracteres</small>
          </div>

          {/* Chat Interno */}
          <div className="section-chat">
            <h3 className="section-title"><MessageOutlined /> Chat Interno</h3>

            {chat.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sem mensagens" />
            ) : (
              <div className="chat-messages">
                {chat.map((msg, idx) => (
                  <div key={idx} className="chat-message">
                    <strong className="msg-usuario">{msg.usuario?.nome || 'Sistema'}</strong>
                    <p className="msg-conteudo">{msg.conteudo}</p>
                    <small className="msg-hora">{new Date(msg.criado_em).toLocaleString('pt-BR')}</small>
                  </div>
                ))}
              </div>
            )}

            <div className="chat-input">
              <Input.TextArea
                rows={2}
                placeholder="Enviar mensagem para a equipe..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') {
                    enviarMensagem();
                  }
                }}
                className="input-mensagem"
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={enviarMensagem}
                size="large"
                className="btn-enviar"
                block
                style={{ marginTop: '8px' }}
              >
                Enviar Mensagem
              </Button>
            </div>
          </div>

          {/* Assinatura */}
          <div className="section-assinatura">
            <h3 className="section-title"><SafetyCertificateOutlined /> Assinatura do Cliente</h3>

            {assinatura ? (
              <div className="assinatura-display">
                <Image
                  src={assinatura}
                  alt="Assinatura"
                  width="100%"
                  className="signature-image"
                />
                <Button
                  type="default"
                  icon={<EditOutlined />}
                  onClick={() => setShowSignature(true)}
                  size="large"
                  block
                  className="btn-reediatar"
                  style={{ marginTop: '8px' }}
                >
                  Refazer Assinatura
                </Button>
              </div>
            ) : (
              <Button
                type="default"
                size="large"
                block
                onClick={() => setShowSignature(true)}
                className="btn-assinar"
              >
                Obter Assinatura do Cliente
              </Button>
            )}
          </div>

          {/* Botão Finalizar */}
          <Button
            type="primary"
            danger
            size="large"
            block
            icon={<CheckCircleOutlined />}
            onClick={finalizar}
            loading={loading}
            className="btn-finalizar"
          >
            Finalizar Serviço
          </Button>
        </Space>

        {isOffline && (
          <div className="offline-banner">
            📶 Modo offline ativo. Os dados serão sincronizados quando a conexão for restaurada.
          </div>
        )}

        {/* Modal de Assinatura */}
        {showSignature && (
          <SignatureCanvas
            onSign={salvarAssinatura}
            onClose={() => setShowSignature(false)}
          />
        )}
      </div>
    </PageContainer>
  );
}
