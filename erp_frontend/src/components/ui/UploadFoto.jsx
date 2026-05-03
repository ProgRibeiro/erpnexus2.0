import { useState } from 'react';
import { Button, message } from 'antd';
import { CameraOutlined, PlusOutlined } from '@ant-design/icons';

export default function UploadFoto({ onPhotosChange, maxPhotos = 10 }) {
  const [fotos, setFotos] = useState([]);
  const fileInputRef = document.createElement('input');

  const handleCameraClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (fotos.length >= maxPhotos) {
        message.error(`Máximo de ${maxPhotos} fotos atingido`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const novasFotos = [...fotos, { url: event.target.result, file }];
        setFotos(novasFotos);
        onPhotosChange(novasFotos);
        message.success('Foto capturada');
      };
      reader.readAsDataURL(file);
    };

    input.click();
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      let count = 0;

      files.forEach((file) => {
        if (fotos.length + count < maxPhotos) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setFotos((prev) => {
              const updated = [...prev, { url: event.target.result, file }];
              onPhotosChange(updated);
              return updated;
            });
            count++;
          };
          reader.readAsDataURL(file);
        }
      });

      if (files.length > maxPhotos - fotos.length) {
        message.warning(`Apenas ${maxPhotos - fotos.length} fotos puderam ser adicionadas`);
      }
    };

    input.click();
  };

  const handleRemovePhoto = (index) => {
    const updated = fotos.filter((_, i) => i !== index);
    setFotos(updated);
    onPhotosChange(updated);
  };

  return (
    <div className="erp-page-card">
      <div style={{ marginBottom: '16px' }}>
        <div className="erp-metric-label">Fotos ({fotos.length}/{maxPhotos})</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {fotos.map((foto, idx) => (
          <div
            key={idx}
            style={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #f0f0f0',
              cursor: 'pointer',
              group: 'group',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.querySelector('.remove-btn').style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.querySelector('.remove-btn').style.opacity = '0';
            }}
          >
            <img
              src={foto.url}
              alt={`Foto ${idx}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <button
              className="remove-btn"
              onClick={() => handleRemovePhoto(idx)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s',
              }}
            >
              Remover
            </button>
          </div>
        ))}

        {fotos.length < maxPhotos && (
          <>
            <button
              onClick={handleCameraClick}
              style={{
                aspectRatio: '1',
                borderRadius: '8px',
                border: '2px dashed #d9d9d9',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.color = '#3B82F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d9d9d9';
                e.currentTarget.style.color = 'inherit';
              }}
            >
              <CameraOutlined style={{ fontSize: '24px' }} />
              <span style={{ fontSize: '12px', fontWeight: '600' }}>Câmera</span>
            </button>

            <button
              onClick={handleFileSelect}
              style={{
                aspectRatio: '1',
                borderRadius: '8px',
                border: '2px dashed #d9d9d9',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.color = '#3B82F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d9d9d9';
                e.currentTarget.style.color = 'inherit';
              }}
            >
              <PlusOutlined style={{ fontSize: '24px' }} />
              <span style={{ fontSize: '12px', fontWeight: '600' }}>Escolher</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
