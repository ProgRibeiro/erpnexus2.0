import React, { useEffect, useState } from 'react';
import { Badge, Button, Drawer, Empty, List, Space, Spin, Tag } from 'antd';
import {
  CloudUploadOutlined,
  CloudDownloadOutlined,
  DisconnectOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useOffline } from '../hooks/useOffline';
import { useSyncQueue } from '../hooks/useSyncQueue';
import './OfflineIndicator.css';

export function OfflineIndicator() {
  const { isOffline, syncStatus, pendingRequests, unsyncedPhotos, unsyncedChats, triggerSync } = useOffline();
  const { queue, syncing, syncErrors, getQueueStats } = useSyncQueue();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const stats = getQueueStats();
  const totalPending = unsyncedPhotos.length + unsyncedChats.length + stats.pending;

  useEffect(() => {
    if (isOffline) {
      console.log('[OfflineIndicator] Modo offline ativado');
    }
  }, [isOffline]);

  if (!isOffline && syncStatus === 'idle' && totalPending === 0) {
    return null;
  }

  const getStatusIcon = () => {
    if (isOffline) {
      return <DisconnectOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />;
    }
    if (syncing || syncStatus === 'syncing') {
      return <Spin size="small" />;
    }
    if (syncStatus === 'error' || syncErrors.length > 0) {
      return <CloseCircleOutlined style={{ fontSize: 20, color: '#ff7875' }} />;
    }
    return <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} />;
  };

  const getStatusText = () => {
    if (isOffline) {
      return 'Offline';
    }
    if (syncing || syncStatus === 'syncing') {
      return 'Sincronizando...';
    }
    if (syncStatus === 'error') {
      return 'Erro na sincronização';
    }
    return 'Online';
  };

  const renderQueueItem = (item) => (
    <List.Item
      key={item.tag}
      actions={[
        <Tag color={item.retries > 2 ? 'red' : 'blue'}>
          {item.method} {item.retries || 0}/{item.maxRetries}
        </Tag>
      ]}
    >
      <List.Item.Meta
        title={<code style={{ fontSize: 12 }}>{item.url}</code>}
        description={`Enfileirado em ${new Date(item.timestamp).toLocaleTimeString('pt-BR')}`}
      />
    </List.Item>
  );

  const renderPhotoItem = (photo) => (
    <List.Item key={photo.id}>
      <List.Item.Meta
        avatar={<CloudUploadOutlined style={{ color: '#1890ff' }} />}
        title={`Foto: ${photo.name || photo.id}`}
        description={`Enfileirada em ${new Date(photo.timestamp).toLocaleTimeString('pt-BR')}`}
      />
    </List.Item>
  );

  const renderChatItem = (chat) => (
    <List.Item key={chat.id}>
      <List.Item.Meta
        avatar={<CloudUploadOutlined style={{ color: '#722ed1' }} />}
        title={`Mensagem`}
        description={`Enfileirada em ${new Date(chat.timestamp).toLocaleTimeString('pt-BR')}`}
      />
    </List.Item>
  );

  return (
    <>
      <div
        className="offline-indicator"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          backgroundColor: isOffline ? '#fff1f0' : '#f6ffed',
          border: `1px solid ${isOffline ? '#ffccc7' : '#b7eb8f'}`,
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onClick={() => setDrawerOpen(true)}
      >
        <Badge count={totalPending} showZero color="#faad14">
          <Button
            type="text"
            icon={getStatusIcon()}
            title={getStatusText()}
            size="small"
          />
        </Badge>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{getStatusText()}</span>
      </div>

      <Drawer
        title={
          <Space>
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </Space>
        }
        placement="bottom"
        height={400}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        extra={
          <Space>
            {totalPending > 0 && (
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={syncing || syncStatus === 'syncing'}
                onClick={triggerSync}
              >
                Sincronizar Agora
              </Button>
            )}
          </Space>
        }
      >
        <Spin spinning={syncing || syncStatus === 'syncing'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Status */}
            <div>
              <h4>Status</h4>
              <Space wrap>
                <Tag color={isOffline ? 'red' : 'green'}>
                  {isOffline ? 'Offline' : 'Online'}
                </Tag>
                {stats.total > 0 && (
                  <>
                    <Tag color="blue">
                      <CloudDownloadOutlined /> {stats.total} na fila
                    </Tag>
                    <Tag color="orange">
                      <CloudUploadOutlined /> {unsyncedPhotos.length} fotos
                    </Tag>
                  </>
                )}
              </Space>
            </div>

            {/* Requisições na fila */}
            {queue.length > 0 && (
              <div>
                <h4>Requisições na Fila ({queue.length})</h4>
                <List
                  dataSource={queue.slice(0, 5)}
                  renderItem={renderQueueItem}
                  locale={{ emptyText: 'Nenhuma requisição na fila' }}
                  size="small"
                />
                {queue.length > 5 && (
                  <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                    ... e mais {queue.length - 5} requisições
                  </div>
                )}
              </div>
            )}

            {/* Fotos não sincronizadas */}
            {unsyncedPhotos.length > 0 && (
              <div>
                <h4>Fotos Pendentes ({unsyncedPhotos.length})</h4>
                <List
                  dataSource={unsyncedPhotos.slice(0, 3)}
                  renderItem={renderPhotoItem}
                  locale={{ emptyText: 'Nenhuma foto pendente' }}
                  size="small"
                />
              </div>
            )}

            {/* Mensagens não sincronizadas */}
            {unsyncedChats.length > 0 && (
              <div>
                <h4>Mensagens Pendentes ({unsyncedChats.length})</h4>
                <List
                  dataSource={unsyncedChats.slice(0, 3)}
                  renderItem={renderChatItem}
                  locale={{ emptyText: 'Nenhuma mensagem pendente' }}
                  size="small"
                />
              </div>
            )}

            {/* Erros */}
            {syncErrors.length > 0 && (
              <div>
                <h4 style={{ color: '#ff4d4f' }}>Erros ({syncErrors.length})</h4>
                <List
                  dataSource={syncErrors.slice(0, 3)}
                  renderItem={(error) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                        title={<code style={{ fontSize: 11 }}>{error.url}</code>}
                        description={error.message}
                      />
                    </List.Item>
                  )}
                  size="small"
                />
              </div>
            )}

            {/* Sem pendências */}
            {queue.length === 0 &&
              unsyncedPhotos.length === 0 &&
              unsyncedChats.length === 0 && (
                <Empty description="Tudo sincronizado!" />
              )}
          </div>
        </Spin>
      </Drawer>
    </>
  );
}
