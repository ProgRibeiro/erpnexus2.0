import { useEffect, useState } from "react";
import { Button, Card, Col, Empty, Row, Space, Table, Typography, Upload, message } from "antd";
import { SolutionOutlined, UploadOutlined } from "@ant-design/icons";

import api from "../../services/api";

const { Text, Title } = Typography;
const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const colors = {
  azul: "#3B82F6",
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  fundoSuave: "#F8FAFD",
};

const pageStyle = {
  minHeight: "100vh",
  background: colors.fundoSuave,
  padding: 24,
};

const panelStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

export default function PortalTerceiroPage() {
  const [dados, setDados] = useState({ ordens: [], lancamentos: [] });
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    try {
      setLoading(true);
      const response = await api.get("/terceiros/portal/");
      setDados(response.data);
    } catch {
      message.error("Seu usuário ainda não está vinculado a um terceirizado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const enviarFoto = async (ordem, file) => {
    const formData = new FormData();
    formData.append("ordem", ordem.id);
    formData.append("arquivo", file);
    formData.append("tipo", "depois");
    try {
      await api.post("/terceiros/portal/", formData);
      message.success("Foto anexada na OS.");
      carregar();
    } catch {
      message.error("Erro ao anexar foto.");
    }
    return false;
  };

  return (
    <div style={pageStyle}>
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
          <Space align="start">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${colors.azul}14`,
                color: colors.azul,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              <SolutionOutlined />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 24, fontWeight: 800 }}>
                Portal do Terceirizado
              </Title>
              <Text style={{ color: colors.textoSecundario }}>
                {dados.terceiro?.nome_fantasia || dados.terceiro?.nome || "Terceirizado"}
              </Text>
            </div>
          </Space>
        </Card>
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={14}>
            <Card bordered={false} style={panelStyle} title="Serviços aprovados / em execução">
              <Table
                loading={loading}
                rowKey="id"
                dataSource={dados.ordens || []}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Nenhuma OS aprovada ou em execução"
                      style={{ padding: "24px 0" }}
                    />
                  ),
                }}
                columns={[
                  { title: "OS", dataIndex: "numero" },
                  { title: "Status", dataIndex: "status" },
                  { title: "Tipo", dataIndex: "tipo_servico" },
                  { title: "Data", dataIndex: "data_agendada" },
                  {
                    title: "Fotos",
                    render: (_, ordem) => (
                      <Upload beforeUpload={(file) => enviarFoto(ordem, file)} showUploadList={false}>
                        <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>Anexar foto</Button>
                      </Upload>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card bordered={false} style={panelStyle} title="Financeiro">
              <Table
                loading={loading}
                rowKey="id"
                dataSource={dados.lancamentos || []}
                pagination={false}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Nenhum lançamento financeiro"
                      style={{ padding: "24px 0" }}
                    />
                  ),
                }}
                columns={[
                  { title: "Descrição", dataIndex: "descricao" },
                  { title: "Status", dataIndex: "status" },
                  { title: "Valor", dataIndex: "valor", render: (value) => moneyFormatter.format(Number(value || 0)) },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}
