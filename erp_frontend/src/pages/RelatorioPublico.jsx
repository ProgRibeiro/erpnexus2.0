import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Image,
  Input,
  Layout,
  message,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { QRCodeSVG as QRCode } from "qrcode.react";
import {
  ArrowDownOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  ShareAltOutlined,
  ToolOutlined,
  UserOutlined,
  WalletOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { useParams } from "react-router-dom";
import api from "../services/api";

const { Header, Footer, Content } = Layout;
const { Text, Title, Paragraph } = Typography;

const colors = {
  azul: "#3B82F6",
  roxo: "#5B21B6",
  verde: "#1A7A4A",
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  fundoSuave: "#F8FAFD",
};

const pageStyle = {
  minHeight: "100vh",
  background: colors.fundoSuave,
  padding: 0,
};

const contentStyle = {
  background: colors.fundoSuave,
  minHeight: "calc(100vh - 64px - 70px)",
  padding: "32px 16px 48px",
};

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
  marginBottom: 20,
  overflow: "hidden",
};

const headerCardStyle = {
  ...cardStyle,
  background: "linear-gradient(135deg, #3B82F6 0%, #5B21B6 100%)",
  border: "none",
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const statusConfig = {
  rascunho: { label: "Rascunho", color: "default" },
  aberta: { label: "Aberta", color: "processing" },
  orcamento_enviado: { label: "Orçamento Enviado", color: "warning" },
  aprovada: { label: "Aprovada", color: "cyan" },
  agendada: { label: "Agendada", color: "blue" },
  em_execucao: { label: "Em Execução", color: "processing" },
  concluida: { label: "Concluída", color: "success" },
  faturada: { label: "Faturada", color: "success" },
  cancelada: { label: "Cancelada", color: "error" },
};

export default function RelatorioPublicoPage() {
  const { token } = useParams();
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const baseUrl = window.location.origin;
  const relatorioUrl = `${baseUrl}/relatorio/${token}`;

  useEffect(() => {
    carregarRelatorio();
  }, [token]);

  const carregarRelatorio = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/ordens/publico/relatorio/${token}/`);
      setRelatorio(response.data);
      setError(null);
    } catch (err) {
      console.error("Erro ao carregar relatório:", err);
      setError("Não foi possível carregar o relatório. Verifique o link.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(relatorioUrl);
    message.success("Link copiado para a área de transferência!");
  };

  const handleCompartilharWhatsApp = () => {
    const numeroCliente = relatorio?.cliente?.telefone || relatorio?.cliente?.celular;
    if (!numeroCliente) {
      message.warning("Número de WhatsApp do cliente não disponível");
      return;
    }
    const texto = encodeURIComponent(
      `Olá! Segue o relatório da sua ordem de serviço ${relatorio?.numero}:\n${relatorioUrl}`
    );
    window.open(`https://wa.me/${numeroCliente}?text=${texto}`, "_blank");
  };

  const handleCompartilhar = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Relatório OS ${relatorio?.numero}`,
          text: `Confira o relatório completo da sua ordem de serviço`,
          url: relatorioUrl,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Erro ao compartilhar:", err);
        }
      }
    } else {
      handleCopiarLink();
    }
  };

  const handleBaixarPDF = async () => {
    try {
      const response = await api.get(`/ordens/publico/relatorio/${token}/pdf/`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `relatorio_${relatorio?.numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentChild?.removeChild(link);
      message.success("PDF baixado com sucesso!");
    } catch (err) {
      console.error("Erro ao baixar PDF:", err);
      message.error("Erro ao baixar o PDF");
    }
  };

  if (loading) {
    return (
      <Layout style={pageStyle}>
        <Header
          style={{
            background: "rgba(255, 255, 255, 0.96)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: `1px solid ${colors.borda}`,
            boxShadow: "0 6px 20px rgba(15, 23, 42, 0.04)",
          }}
        >
          <Title level={3} style={{ margin: 0, color: colors.azul, fontWeight: 800 }}>
            Relatório de Serviço
          </Title>
        </Header>
        <Content style={contentStyle}>
          <div style={{ textAlign: "center", paddingTop: 120 }}>
            <Spin size="large" />
          </div>
        </Content>
      </Layout>
    );
  }

  if (error || !relatorio) {
    return (
      <Layout style={pageStyle}>
        <Header
          style={{
            background: "rgba(255, 255, 255, 0.96)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: `1px solid ${colors.borda}`,
            boxShadow: "0 6px 20px rgba(15, 23, 42, 0.04)",
          }}
        >
          <Title level={3} style={{ margin: 0, color: colors.azul, fontWeight: 800 }}>
            Relatório de Serviço
          </Title>
        </Header>
        <Content style={contentStyle}>
          <div style={{ textAlign: "center", paddingTop: 100 }}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={error || "Relatório não encontrado"} style={{ marginTop: 50 }} />
          </div>
        </Content>
      </Layout>
    );
  }

  const fotosAntes = relatorio.fotos?.filter((f) => f.tipo === "antes") || [];
  const fotosDepois = relatorio.fotos?.filter((f) => f.tipo === "depois") || [];

  return (
    <Layout style={pageStyle}>
      <Header
        style={{
          background: "rgba(255, 255, 255, 0.96)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 24,
          paddingRight: 24,
          borderBottom: `1px solid ${colors.borda}`,
          boxShadow: "0 6px 20px rgba(15, 23, 42, 0.04)",
        }}
      >
        <Space align="center" size={12}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #3B82F6, #5B21B6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 17,
              flexShrink: 0,
            }}
          >
            <SafetyCertificateOutlined />
          </div>
          <Title level={4} style={{ margin: 0, color: colors.texto, fontWeight: 800, lineHeight: 1.1 }}>
            Relatório OS {relatorio.numero}
          </Title>
        </Space>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleBaixarPDF}
          style={{ borderRadius: 8, fontWeight: 600, transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 10px 22px rgba(59, 130, 246, 0.28)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Baixar PDF
        </Button>
      </Header>

      <Content style={contentStyle}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {/* Dados Principais */}
          <Card style={headerCardStyle} bodyStyle={{ padding: 28 }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12}>
                <div>
                  <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>
                    ORDEM DE SERVIÇO
                  </Text>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF", marginTop: 4 }}>
                    {relatorio.numero}
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>
                    STATUS
                  </Text>
                  <div style={{ marginTop: 6 }}>
                    {relatorio.status === "concluida" ? (
                      <Space size="small">
                        <CheckCircleOutlined style={{ fontSize: 20, color: "#A7F3D0" }} />
                        <Text strong style={{ color: "#FFFFFF", fontSize: 17 }}>
                          Concluída
                        </Text>
                      </Space>
                    ) : (
                      <Tag
                        color={statusConfig[relatorio.status]?.color || "default"}
                        style={{ fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 6 }}
                      >
                        {statusConfig[relatorio.status]?.label || relatorio.status}
                      </Tag>
                    )}
                  </div>
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: "20px 0", borderColor: "rgba(255,255,255,0.18)" }} />

            <Row gutter={[24, 18]}>
              <Col xs={24} sm={12}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <UserOutlined style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 3 }} />
                  <div>
                    <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>
                      CLIENTE
                    </Text>
                    <Paragraph style={{ margin: "4px 0 0 0", fontSize: 16, fontWeight: 600, color: "#FFFFFF" }}>
                      {relatorio.cliente?.nome}
                    </Paragraph>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <ToolOutlined style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 3 }} />
                  <div>
                    <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>
                      TIPO DE SERVIÇO
                    </Text>
                    <Paragraph style={{ margin: "4px 0 0 0", fontSize: 16, fontWeight: 600, color: "#FFFFFF" }}>
                      {relatorio.tipo_servico?.toUpperCase()}
                    </Paragraph>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <CalendarOutlined style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 3 }} />
                  <div>
                    <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>
                      DATA AGENDADA
                    </Text>
                    <Paragraph style={{ margin: "4px 0 0 0", fontSize: 16, fontWeight: 600, color: "#FFFFFF" }}>
                      {relatorio.data_agendada
                        ? new Date(relatorio.data_agendada).toLocaleDateString("pt-BR")
                        : "-"}
                    </Paragraph>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <WalletOutlined style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 3 }} />
                  <div>
                    <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>
                      VALOR TOTAL
                    </Text>
                    <Paragraph style={{ margin: "4px 0 0 0", fontSize: 16, fontWeight: 600, color: "#FFFFFF" }}>
                      {moneyFormatter.format(relatorio.valor_total_orcado || 0)}
                    </Paragraph>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Descrição do Serviço */}
          {relatorio.descricao_servico && (
            <Card style={cardStyle} bodyStyle={{ padding: 24 }}>
              <Title level={4} style={{ marginTop: 0, marginBottom: 14, color: colors.texto, display: "flex", alignItems: "center", gap: 10 }}>
                <FileTextOutlined style={{ color: colors.azul }} /> Descrição do Serviço
              </Title>
              <Paragraph style={{ color: colors.textoSecundario, fontSize: 15, lineHeight: 1.7, marginBottom: 0 }}>
                {relatorio.descricao_servico}
              </Paragraph>
            </Card>
          )}

          {/* Fotos Antes */}
          {fotosAntes.length > 0 && (
            <Card style={cardStyle} bodyStyle={{ padding: 24 }}>
              <Title level={4} style={{ marginTop: 0, marginBottom: 14, color: colors.texto }}>
                Fotos — Antes
              </Title>
              <Row gutter={[12, 12]}>
                {fotosAntes.map((foto) => (
                  <Col xs={12} sm={8} md={6} key={foto.id}>
                    <Image
                      src={foto.arquivo}
                      style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 10, border: `1px solid ${colors.borda}` }}
                      preview={{
                        mask: "Visualizar",
                      }}
                    />
                    {foto.legenda && (
                      <Text style={{ display: "block", marginTop: 6, fontSize: 12, color: colors.textoFraco }}>
                        {foto.legenda}
                      </Text>
                    )}
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* Fotos Depois */}
          {fotosDepois.length > 0 && (
            <Card style={cardStyle} bodyStyle={{ padding: 24 }}>
              <Title level={4} style={{ marginTop: 0, marginBottom: 14, color: colors.texto, display: "flex", alignItems: "center", gap: 10 }}>
                <ArrowDownOutlined style={{ color: colors.verde }} /> Fotos — Depois
              </Title>
              <Row gutter={[12, 12]}>
                {fotosDepois.map((foto) => (
                  <Col xs={12} sm={8} md={6} key={foto.id}>
                    <Image
                      src={foto.arquivo}
                      style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 10, border: `1px solid ${colors.borda}` }}
                      preview={{
                        mask: "Visualizar",
                      }}
                    />
                    {foto.legenda && (
                      <Text style={{ display: "block", marginTop: 6, fontSize: 12, color: colors.textoFraco }}>
                        {foto.legenda}
                      </Text>
                    )}
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* Assinatura do Cliente */}
          {relatorio.assinatura_cliente && (
            <Card style={cardStyle} bodyStyle={{ padding: 24 }}>
              <Title level={4} style={{ marginTop: 0, marginBottom: 14, color: colors.texto, display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircleOutlined style={{ color: colors.verde }} /> Assinatura do Cliente
              </Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <div>
                    <Text style={{ color: colors.textoFraco, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>
                      NOME
                    </Text>
                    <Paragraph style={{ margin: "6px 0 0 0", color: colors.texto, fontWeight: 600 }}>
                      {relatorio.assinatura_cliente.nome_signatario}
                    </Paragraph>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div>
                    <Text style={{ color: colors.textoFraco, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>
                      DATA
                    </Text>
                    <Paragraph style={{ margin: "6px 0 0 0", color: colors.texto, fontWeight: 600 }}>
                      {new Date(relatorio.assinatura_cliente.data_assinatura).toLocaleDateString(
                        "pt-BR"
                      )}
                    </Paragraph>
                  </div>
                </Col>
              </Row>
              <div
                style={{
                  marginTop: 16,
                  textAlign: "center",
                  padding: 16,
                  borderRadius: 12,
                  border: `1px dashed ${colors.borda}`,
                  background: colors.fundoSuave,
                }}
              >
                <Image
                  src={relatorio.assinatura_cliente.imagem_assinatura}
                  style={{ maxWidth: 300, maxHeight: 150 }}
                  preview={{
                    mask: "Visualizar",
                  }}
                />
              </div>
            </Card>
          )}

          {/* QR Code e Compartilhamento */}
          <Card style={{ ...cardStyle, marginBottom: 0 }} bodyStyle={{ padding: 24 }}>
            <Title level={4} style={{ marginTop: 0, marginBottom: 18, color: colors.texto, display: "flex", alignItems: "center", gap: 10 }}>
              <ShareAltOutlined style={{ color: colors.azul }} /> Compartilhar Relatório
            </Title>
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12}>
                <Space direction="vertical" style={{ width: "100%" }} size="large">
                  <div>
                    <Text style={{ color: colors.textoFraco, fontSize: 12, fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>
                      LINK DO RELATÓRIO
                    </Text>
                    <Input.Group compact style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        value={relatorioUrl}
                        readOnly
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          border: `1px solid ${colors.borda}`,
                          borderRadius: 8,
                          fontSize: 12,
                          fontFamily: "monospace",
                          background: colors.fundoSuave,
                          color: colors.textoSecundario,
                        }}
                      />
                      <Button icon={<CopyOutlined />} onClick={handleCopiarLink} style={{ borderRadius: 8 }}>
                        Copiar
                      </Button>
                    </Input.Group>
                  </div>

                  <Space direction="vertical" style={{ width: "100%" }} size={10}>
                    <Button
                      block
                      type="primary"
                      size="large"
                      icon={<ShareAltOutlined />}
                      onClick={handleCompartilhar}
                      style={{ borderRadius: 8, fontWeight: 600 }}
                    >
                      Compartilhar
                    </Button>
                    <Button
                      block
                      size="large"
                      style={{
                        background: "#25D366",
                        borderColor: "#25D366",
                        color: "white",
                        borderRadius: 8,
                        fontWeight: 600,
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 10px 22px rgba(37, 211, 102, 0.32)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      icon={<WhatsAppOutlined />}
                      onClick={handleCompartilharWhatsApp}
                    >
                      Enviar por WhatsApp
                    </Button>
                  </Space>
                </Space>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ textAlign: "center" }}>
                  <Text style={{ color: colors.textoFraco, fontSize: 12, fontWeight: 700, display: "block", marginBottom: 12, letterSpacing: "0.05em" }}>
                    CÓDIGO QR
                  </Text>
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: `1px solid ${colors.borda}`,
                      padding: 18,
                      borderRadius: 14,
                      display: "inline-block",
                    }}
                  >
                    <QRCode value={relatorioUrl} size={200} level="H" includeMargin={true} />
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      </Content>

      <Footer
        style={{
          textAlign: "center",
          background: "rgba(255, 255, 255, 0.96)",
          borderTop: `1px solid ${colors.borda}`,
          padding: "18px 24px",
        }}
      >
        <Text style={{ color: colors.textoFraco, fontSize: 12 }}>
          © 2026 ERP Nexus — Relatório Público. Todos os direitos reservados.
        </Text>
      </Footer>
    </Layout>
  );
}
