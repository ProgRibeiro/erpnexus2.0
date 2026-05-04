import { useEffect, useState } from "react";
import { Button, Card, Col, Row, Space, Table, Typography, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";

import api from "../../services/api";

const { Text, Title } = Typography;
const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

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
    <div style={{ minHeight: "100vh", background: "#F4F6F9", padding: 24 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card>
          <Title level={2} style={{ margin: 0 }}>Portal do Terceirizado</Title>
          <Text>{dados.terceiro?.nome_fantasia || dados.terceiro?.nome || "Terceirizado"}</Text>
        </Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title="Serviços aprovados / em execução">
              <Table
                loading={loading}
                rowKey="id"
                dataSource={dados.ordens || []}
                columns={[
                  { title: "OS", dataIndex: "numero" },
                  { title: "Status", dataIndex: "status" },
                  { title: "Tipo", dataIndex: "tipo_servico" },
                  { title: "Data", dataIndex: "data_agendada" },
                  {
                    title: "Fotos",
                    render: (_, ordem) => (
                      <Upload beforeUpload={(file) => enviarFoto(ordem, file)} showUploadList={false}>
                        <Button icon={<UploadOutlined />}>Anexar foto</Button>
                      </Upload>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="Financeiro">
              <Table
                loading={loading}
                rowKey="id"
                dataSource={dados.lancamentos || []}
                pagination={false}
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
