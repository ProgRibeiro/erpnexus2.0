import { Card, Col, Row, Space, Tag, Typography } from "antd";

const { Text } = Typography;

const colors = {
  azul: "#3B82F6",
  verde: "#1A7A4A",
  texto: "#10233C",
  textoSecundario: "#5A6070",
};

const alertaFiscalColor = {
  ok: "green",
  perto_sublimite: "gold",
  acima_sublimite: "orange",
  perto_teto: "volcano",
  acima_teto: "red",
};

const alertaFiscalLabel = {
  ok: "Dentro dos limites",
  perto_sublimite: "Perto do sublimite",
  acima_sublimite: "Acima do sublimite",
  perto_teto: "Perto do teto",
  acima_teto: "Acima do teto",
};

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const percent = (value) =>
  `${(Number(value || 0) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;

export default function SimplesApuracaoResumo({
  apuracao,
  title = "Base usada no Simples Nacional",
  compact = false,
  style,
}) {
  if (!apuracao) return null;

  return (
    <Card
      size="small"
      style={{ borderRadius: 12, ...style }}
      bodyStyle={{ padding: compact ? 10 : 12 }}
    >
      <Text strong style={{ color: colors.texto }}>
        {title}
      </Text>
      <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
        <Col xs={24} sm={12}>
          <div style={{ color: colors.textoSecundario, fontSize: 12 }}>
            RBT12 considerado
          </div>
          <div style={{ fontWeight: 800, color: colors.texto }}>
            {money(apuracao.rbt12)}
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div style={{ color: colors.textoSecundario, fontSize: 12 }}>
            Faixa / alerta
          </div>
          <Space wrap>
            <Tag color="blue">Faixa {apuracao.faixa}</Tag>
            <Tag color={alertaFiscalColor[apuracao.alerta] || "default"}>
              {alertaFiscalLabel[apuracao.alerta] || apuracao.alerta}
            </Tag>
          </Space>
        </Col>
        <Col xs={24} sm={12}>
          <div style={{ color: colors.textoSecundario, fontSize: 12 }}>
            Alíquota efetiva
          </div>
          <div style={{ fontWeight: 800, color: colors.azul }}>
            {percent(apuracao.aliquota_efetiva)}
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div style={{ color: colors.textoSecundario, fontSize: 12 }}>
            DAS estimado da operação
          </div>
          <div style={{ fontWeight: 800, color: colors.verde }}>
            {money(apuracao.das_estimado)}
          </div>
        </Col>
      </Row>
    </Card>
  );
}