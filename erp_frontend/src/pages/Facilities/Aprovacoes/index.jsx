import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Tag, Typography, Space, Spin, Modal, Input, message, Empty } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../../services/api";

const { Title, Text } = Typography;

const tipoLabel = {
  orcamento: "Orçamento",
  ordem_compra: "Ordem de Compra",
  despesa: "Despesa",
};
const tipoColor = {
  orcamento: "blue",
  ordem_compra: "orange",
  despesa: "purple",
};
const nivelLabel = {
  1: "Nível 1 — Gestor",
  2: "Nível 2 — Diretor",
  3: "Nível 3 — Executivo",
};

export default function AprovacoesPage() {
  const [aprovacoes, setAprovacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcao, setModalAcao] = useState(null);
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const carregar = () => {
    setLoading(true);
    api.get("/portal/contratante/aprovacoes-pendentes/")
      .then((r) => setAprovacoes(Array.isArray(r.data) ? r.data : (r.data?.results || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const executarAcao = async () => {
    if (!modalAcao) return;
    setSaving(true);
    const endpoint = modalAcao.tipo === "aprovar"
      ? `/portal/contratante/aprovacoes/${modalAcao.id}/aprovar/`
      : `/portal/contratante/aprovacoes/${modalAcao.id}/reprovar/`;
    try {
      await api.post(endpoint, { observacao: obs });
      message.success(modalAcao.tipo === "aprovar" ? "Aprovado com sucesso!" : "Reprovado com sucesso!");
      setModalAcao(null);
      setObs("");
      carregar();
    } catch {
      message.error("Erro ao processar a ação.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin style={{ display: "block", marginTop: 80, textAlign: "center" }} />;

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <Space direction="vertical" size={4} style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Aprovações Pendentes</Title>
        <Text type="secondary">{aprovacoes.length} item(s) aguardando sua aprovação</Text>
      </Space>

      {aprovacoes.length === 0 ? (
        <Card style={{ borderRadius: 14, textAlign: "center", padding: 40 }}>
          <Empty description="Nenhuma aprovação pendente" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {aprovacoes.map((apr) => (
            <Col xs={24} md={12} lg={8} key={apr.id}>
              <Card
                style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", borderTop: "3px solid #F59E0B" }}
                bodyStyle={{ padding: "20px 24px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <Tag color={tipoColor[apr.objeto_tipo] || "default"}>
                    {tipoLabel[apr.objeto_tipo] || apr.objeto_tipo || "Solicitação"}
                  </Tag>
                  <div style={{ fontWeight: 700, fontSize: 20, color: "#10B981" }}>
                    R$ {Number(apr.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Solicitado por</Text>
                  <div style={{ fontWeight: 600, color: "#111827" }}>{apr.solicitado_por || "-"}</div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Data da Solicitação</Text>
                  <div style={{ fontWeight: 500, color: "#374151" }}>
                    {apr.data_solicitacao ? dayjs(apr.data_solicitacao).format("DD/MM/YYYY HH:mm") : "-"}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Nível de Aprovação</Text>
                  <div>
                    <Tag color="gold">{nivelLabel[apr.nivel_necessario] || `Nível ${apr.nivel_necessario}`}</Tag>
                  </div>
                </div>

                {apr.observacao_aprovacao && (
                  <div style={{ marginBottom: 12, padding: "8px 12px", background: "#F3F4F6", borderRadius: 8, fontSize: 13, color: "#374151" }}>
                    {apr.observacao_aprovacao}
                  </div>
                )}

                <Space style={{ marginTop: 4 }}>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    style={{ background: "#10B981", borderColor: "#10B981" }}
                    onClick={() => setModalAcao({ id: apr.id, tipo: "aprovar", valor: apr.valor })}
                  >
                    Aprovar
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => setModalAcao({ id: apr.id, tipo: "reprovar", valor: apr.valor })}
                  >
                    Reprovar
                  </Button>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={modalAcao?.tipo === "aprovar" ? "Confirmar Aprovação" : "Confirmar Reprovação"}
        open={!!modalAcao}
        onCancel={() => { setModalAcao(null); setObs(""); }}
        onOk={executarAcao}
        okText={modalAcao?.tipo === "aprovar" ? "Confirmar Aprovação" : "Confirmar Reprovação"}
        cancelText="Cancelar"
        confirmLoading={saving}
        okButtonProps={{
          style: modalAcao?.tipo === "aprovar"
            ? { background: "#10B981", borderColor: "#10B981" }
            : { background: "#EF4444", borderColor: "#EF4444" },
        }}
      >
        {modalAcao && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text>Você está {modalAcao.tipo === "aprovar" ? "aprovando" : "reprovando"} uma solicitação de{" "}
                <strong>R$ {Number(modalAcao.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>.
              </Text>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text>Observação (opcional):</Text>
            </div>
            <Input.TextArea
              rows={3}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Adicione uma observação se necessário..."
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
