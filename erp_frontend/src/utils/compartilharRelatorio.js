/**
 * Utilitários para compartilhamento de relatórios públicos
 */

export const compartilharRelatorio = {
  /**
   * Copia o link para a área de transferência
   */
  copiarLink: async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (err) {
      console.error("Erro ao copiar link:", err);
      return false;
    }
  },

  /**
   * Compartilha usando a Web Share API (se disponível)
   */
  compartilhar: async (titulo, descricao, url) => {
    if (!navigator.share) {
      return false;
    }

    try {
      await navigator.share({
        title: titulo,
        text: descricao,
        url: url,
      });
      return true;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Erro ao compartilhar:", err);
      }
      return false;
    }
  },

  /**
   * Abre link do WhatsApp para enviar mensagem
   */
  compartilharWhatsApp: (numero, mensagem) => {
    let numeroLimpo = numero.replace(/\D/g, "");
    if (!numeroLimpo.startsWith("55")) {
      numeroLimpo = "55" + numeroLimpo;
    }

    const texto = encodeURIComponent(mensagem);
    const url = `https://wa.me/${numeroLimpo}?text=${texto}`;
    window.open(url, "_blank");
  },

  /**
   * Gera link para enviar por email
   */
  gerarLinkEmail: (email, assunto, mensagem) => {
    const assuntoEncoded = encodeURIComponent(assunto);
    const mensagemEncoded = encodeURIComponent(mensagem);
    return `mailto:${email}?subject=${assuntoEncoded}&body=${mensagemEncoded}`;
  },

  /**
   * Formata o link para compartilhamento no WhatsApp
   */
  formatarMensagemWhatsApp: (numeroOS, url) => {
    return `Olá! Segue o relatório da sua ordem de serviço ${numeroOS}:\n\n${url}\n\nObrigado!`;
  },

  /**
   * Imprime QR Code
   */
  imprimirQRCode: () => {
    window.print();
  },
};

/**
 * Valida e formata número de telefone brasileiro
 */
export const formatarTelefone = (telefone) => {
  const numeros = telefone.replace(/\D/g, "");
  if (numeros.length === 11) {
    return numeros.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (numeros.length === 10) {
    return numeros.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return telefone;
};

/**
 * Obtém número de WhatsApp do cliente
 */
export const obterNumeroWhatsApp = (cliente) => {
  const numero = cliente?.celular || cliente?.telefone;
  if (!numero) return null;
  return numero.replace(/\D/g, "");
};
