import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Tag, Typography, Space, Skeleton, Modal, Input, message, Empty } from "antd";
import { CheckOutlined, CloseOutlined, CheckSquareOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../../services/api";

const { Title, Text } = Typography;

const colors = {
  azul: "#3B82F6",
  roxo: "#5B21B6",
  verde: "#1A7A4A",
  laranja: "#B45309",
  vermelho: "#B91C1C",
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  fundoSuave: "#F8FAFD",
};

const pageStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const panelStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

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

  return (
    <div style={pageStyle}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <Space align="start">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${colors.laranja}14`,
              color: colors.laranja,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            <CheckSquareOutlined />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 26, fontWeight: 800 }}>Aprovações Pendentes</Title>
            <Text style={{ color: colors.textoSecundario }}>
              {loading ? "Carregando..." : `${aprovacoes.length} item(s) aguardando sua aprovação`}
            </Text>
          </div>
        </Space>
      </Card>

      {loading ? (
        <Card bordered={false} style={panelStyle}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : aprovacoes.length === 0 ? (
        <Card bordered={false} style={{ ...panelStyle, textAlign: "center" }} bodyStyle={{ padding: 48 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhuma aprovação pendente" />
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          {aprovacoes.map((apr) => (
            <Col xs={24} md={12} lg={8} key={apr.id}>
              <Card
                bordered={false}
                style={{ ...panelStyle, borderTop: `3px solid ${colors.laranja}`, transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
                bodyStyle={{ padding: 22 }}
                hoverable
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <Tag color={tipoColor[apr.objeto_tipo] || "default"} style={{ borderRadius: 999, fontWeight: 600 }}>
                    {tipoLabel[apr.objeto_tipo] || apr.objeto_tipo || "Solicitação"}
                  </Tag>
                  <div style={{ fontWeight: 800, fontSize: 20, color: colors.verde }}>
                    R$ {Number(apr.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <Text style={{ color: colors.textoFraco, fontSize: 12 }}>Solicitado por</Text>
                  <div style={{ fontWeight: 600, color: colors.texto }}>{apr.solicitado_por || "-"}</div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <Text style={{ color: colors.textoFraco, fontSize: 12 }}>Data da Solicitação</Text>
                  <div style={{ fontWeight: 500, color: colors.textoSecundario }}>
                    {apr.data_solicitacao ? dayjs(apr.data_solicitacao).format("DD/MM/YYYY HH:mm") : "-"}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <Text style={{ color: colors.textoFraco, fontSize: 12 }}>Nível de Aprovação</Text>
                  <div>
                    <Tag color="gold" style={{ borderRadius: 999, fontWeight: 600 }}>{nivelLabel[apr.nivel_necessario] || `Nível ${apr.nivel_necessario}`}</Tag>
                  </div>
                </div>

                {apr.observacao_aprovacao && (
                  <div style={{ marginBottom: 14, padding: "10px 12px", background: colors.fundoSuave, border: `1px solid ${colors.borda}`, borderRadius: 10, fontSize: 13, color: colors.textoSecundario }}>
                    {apr.observacao_aprovacao}
                  </div>
                )}

                <Space style={{ marginTop: 4 }}>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    style={{ background: colors.verde, borderColor: colors.verde, borderRadius: 8, fontWeight: 600 }}
                    onClick={() => setModalAcao({ id: apr.id, tipo: "aprovar", valor: apr.valor })}
                  >
                    Aprovar
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    style={{ borderRadius: 8, fontWeight: 600 }}
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
            ? { background: colors.verde, borderColor: colors.verde }
            : { background: colors.vermelho, borderColor: colors.vermelho },
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
