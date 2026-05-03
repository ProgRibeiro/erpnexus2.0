// Utilidades para o sistema mobile de técnico

/**
 * Formata data ISO para hora legível (HH:mm)
 */
export const formatarHora = (isoString) => {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

/**
 * Formata data ISO para data e hora legível
 */
export const formatarDataHora = (isoString) => {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleString('pt-BR');
  } catch {
    return '-';
  }
};

/**
 * Valida se tem permissão de câmera
 */
export const requestCameraPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });

    // Fechar stream após obter permissão
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Permissão de câmera negada:', error);
    return false;
  }
};

/**
 * Converte blob para base64
 */
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Verifica se está em modo offline
 */
export const isOfflineMode = () => {
  return !navigator.onLine;
};

/**
 * Calcula tempo decorrido entre duas datas
 */
export const calcularDuracao = (inicio, fim) => {
  if (!inicio || !fim) return null;

  const start = new Date(inicio);
  const end = new Date(fim);
  const diffMs = end - start;

  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);

  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  }
  return `${minutes}m`;
};

/**
 * Gera ID único
 */
export const gerarIdUnico = (prefixo = '') => {
  return `${prefixo}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Comprime imagem antes de enviar
 */
export const comprimirImagem = async (file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(resolve, 'image/jpeg', quality);
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Salva arquivo localmente (para debug)
 */
export const salvarLocalmente = (dados, nome) => {
  try {
    localStorage.setItem(`debug_${nome}`, JSON.stringify(dados));
  } catch (error) {
    console.error('Erro ao salvar localmente:', error);
  }
};

/**
 * Obtém dados salvos localmente
 */
export const obterLocalmente = (nome) => {
  try {
    const dados = localStorage.getItem(`debug_${nome}`);
    return dados ? JSON.parse(dados) : null;
  } catch (error) {
    console.error('Erro ao obter dados locais:', error);
    return null;
  }
};
