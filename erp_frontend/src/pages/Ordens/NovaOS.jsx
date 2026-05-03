import { useEffect } from "react";
import { Alert, Button, Card, Space, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Paragraph, Title } = Typography;

const pageStyle = {
  minHeight: "100vh",
  background: "#F4F6F9",
  padding: 24,
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
  maxWidth: 720,
  margin: "40px auto 0",
};

export default function NovaOS() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate("/ordens", {
        replace: true,
        state: { redirectReason: "nova-os" },
      });
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={pageStyle}>
      <Card bordered={false} style={cardStyle} bodyStyle={{ padding: 24 }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Title level={2} style={{ margin: 0, color: "#111827" }}>
            Nova OS
          </Title>

          <Alert
            type="info"
            showIcon
            message="Redirecionando para o fluxo principal da Ordem de Serviço"
            description="Essa rota base foi criada para manter o atalho /ordens/novo funcionando enquanto o formulário completo da OS é conectado."
            style={{ borderRadius: 10 }}
          />

          <Paragraph style={{ color: "#4B5563", margin: 0 }}>
            Se o redirecionamento não acontecer sozinho, você pode continuar manualmente pelo botão abaixo.
          </Paragraph>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/ordens", { replace: true, state: { redirectReason: "nova-os" } })}
            style={{
              alignSelf: "flex-start",
              background: "#3B82F6",
              borderColor: "#3B82F6",
              color: "#ffffff",
              height: "40px",
              paddingLeft: "20px",
              paddingRight: "20px",
              fontWeight: 500,
              fontSize: "14px",
              borderRadius: "8px",
            }}
          >
            Ir para Ordens
          </Button>
        </Space>
      </Card>
    </div>
  );
}
