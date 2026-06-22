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
  Typography,
} from "antd";
import { QRCodeSVG as QRCode } from "qrcode.react";
import {
  ArrowDownOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ShareAltOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { useParams } from "react-router-dom";
import api from "../services/api";

const { Header, Footer, Content } = Layout;
const { Text, Title, Paragraph } = Typography;

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  padding: 0,
};

const contentStyle = {
  background: "#F4F6F9",
  minHeight: "calc(100vh - 64px - 70px)",
  padding: "32px 16px",
};

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  marginBottom: 16,
};

const headerCardStyle = {
  ...cardStyle,
  background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
  borderTop: "4px solid #667eea",
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
            background: "rgba(255, 255, 255, 0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Title level={3} style={{ margin: 0, color: "#667eea" }}>
            Relatório Público
          </Title>
        </Header>
        <Content style={contentStyle}>
          <div style={{ textAlign: "center", paddingTop: 100 }}>
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
            background: "rgba(255, 255, 255, 0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Title level={3} style={{ margin: 0, color: "#667eea" }}>
            Relatório Público
          </Title>
        </Header>
        <Content style={contentStyle}>
          <div style={{ textAlign: "center", paddingTop: 100 }}>
            <Empty description={error || "Relatório não encontrado"} style={{ marginTop: 50 }} />
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
          background: "rgba(255, 255, 255, 0.95)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 24,
          paddingRight: 24,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Title level={3} style={{ margin: 0, color: "#667eea" }}>
          Relatório OS {relatorio.numero}
        </Title>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleBaixarPDF}>
          Baixar PDF
        </Button>
      </Header>

      <Content style={contentStyle}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {/* Dados Principais */}
          <Card style={headerCardStyle}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div>
                  <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: 700 }}>
                    ORDEM DE SERVIÇO
                  </Text>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#667eea", marginTop: 4 }}>
                    {relatorio.numero}
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: 700 }}>
                    STATUS
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    {relatorio.status === "concluida" ? (
                      <Space size="small" style={{ color: "#059669" }}>
                        <CheckCircleOutlined style={{ fontSize: 20 }} />
                        <Text strong style={{ color: "#059669", fontSize: 16 }}>
                          Concluída
                        </Text>
                      </Space>
                    ) : (
                      <Text strong style={{ fontSize: 16, color: "#666" }}>
                        {statusConfig[relatorio.status]?.label || relatorio.status}
                      </Text>
                    )}
                  </div>
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: "16px 0" }} />

            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12}>
                <div>
                  <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: 700 }}>
                    CLIENTE
                  </Text>
                  <Paragraph style={{ margin: "8px 0 0 0", fontSize: 16, fontWeight: 600 }}>
                    {relatorio.cliente?.nome}
                  </Paragraph>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: 700 }}>
                    TIPO DE SERVIÇO
                  </Text>
                  <Paragraph style={{ margin: "8px 0 0 0", fontSize: 16, fontWeight: 600 }}>
                    {relatorio.tipo_servico?.toUpperCase()}
                  </Paragraph>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: 700 }}>
                    DATA AGENDADA
                  </Text>
                  <Paragraph style={{ margin: "8px 0 0 0", fontSize: 16, fontWeight: 600 }}>
                    {relatorio.data_agendada
                      ? new Date(relatorio.data_agendada).toLocaleDateString("pt-BR")
                      : "-"}
                  </Paragraph>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: 700 }}>
                    VALOR TOTAL
                  </Text>
                  <Paragraph style={{ margin: "8px 0 0 0", fontSize: 16, fontWeight: 600 }}>
                    {moneyFormatter.format(relatorio.valor_total_orcado || 0)}
                  </Paragraph>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Descrição do Serviço */}
          {relatorio.descricao_servico && (
            <Card style={cardStyle}>
              <Title level={4} style={{ marginTop: 0 }}>
                <FileTextOutlined /> Descrição do Serviço
              </Title>
              <Paragraph>{relatorio.descricao_servico}</Paragraph>
            </Card>
          )}

          {/* Fotos Antes */}
          {fotosAntes.length > 0 && (
            <Card style={cardStyle}>
              <Title level={4} style={{ marginTop: 0 }}>
                Fotos - ANTES
              </Title>
              <Row gutter={[12, 12]}>
                {fotosAntes.map((foto) => (
                  <Col xs={12} sm={8} md={6} key={foto.id}>
                    <Image
                      src={foto.arquivo}
                      style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 8 }}
                      preview={{
                        mask: "Visualizar",
                      }}
                    />
                    {foto.legenda && (
                      <Text style={{ display: "block", marginTop: 4, fontSize: 12, color: "#666" }}>
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
            <Card style={cardStyle}>
              <Title level={4} style={{ marginTop: 0 }}>
                <ArrowDownOutlined /> Fotos - DEPOIS
              </Title>
              <Row gutter={[12, 12]}>
                {fotosDepois.map((foto) => (
                  <Col xs={12} sm={8} md={6} key={foto.id}>
                    <Image
                      src={foto.arquivo}
                      style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 8 }}
                      preview={{
                        mask: "Visualizar",
                      }}
                    />
                    {foto.legenda && (
                      <Text style={{ display: "block", marginTop: 4, fontSize: 12, color: "#666" }}>
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
            <Card style={cardStyle}>
              <Title level={4} style={{ marginTop: 0 }}>
                ✓ Assinatura do Cliente
              </Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <div>
                    <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: 700 }}>
                      NOME
                    </Text>
                    <Paragraph style={{ margin: "8px 0 0 0" }}>
                      {relatorio.assinatura_cliente.nome_signatario}
                    </Paragraph>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div>
                    <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: 700 }}>
                      DATA
                    </Text>
                    <Paragraph style={{ margin: "8px 0 0 0" }}>
                      {new Date(relatorio.assinatura_cliente.data_assinatura).toLocaleDateString(
                        "pt-BR"
                      )}
                    </Paragraph>
                  </div>
                </Col>
              </Row>
              <div style={{ marginTop: 16, textAlign: "center" }}>
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
          <Card style={cardStyle}>
            <Title level={4} style={{ marginTop: 0 }}>
              Compartilhar Relatório
            </Title>
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12}>
                <Space direction="vertical" style={{ width: "100%" }} size="large">
                  <div>
                    <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: 700, display: "block", marginBottom: 8 }}>
                      Link do Relatório
                    </Text>
                    <Input.Group compact style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        value={relatorioUrl}
                        readOnly
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          border: "1px solid #d9d9d9",
                          borderRadius: 6,
                          fontSize: 12,
                          fontFamily: "monospace",
                        }}
                      />
                      <Button icon={<CopyOutlined />} onClick={handleCopiarLink}>
                        Copiar
                      </Button>
                    </Input.Group>
                  </div>

                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Button
                      block
                      type="primary"
                      icon={<ShareAltOutlined />}
                      onClick={handleCompartilhar}
                    >
                      Compartilhar
                    </Button>
                    <Button
                      block
                      style={{
                        background: "#25D366",
                        borderColor: "#25D366",
                        color: "white",
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
                  <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: 700, display: "block", marginBottom: 12 }}>
                    Código QR
                  </Text>
                  <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, display: "inline-block" }}>
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
          background: "rgba(255, 255, 255, 0.95)",
          borderTop: "1px solid #E2E6EC",
          padding: "16px 24px",
        }}
      >
        <Text style={{ color: "#6B7280", fontSize: 12 }}>
          © 2026 ERP - Relatório Público. Todos os direitos reservados.
        </Text>
      </Footer>
    </Layout>
  );
}
