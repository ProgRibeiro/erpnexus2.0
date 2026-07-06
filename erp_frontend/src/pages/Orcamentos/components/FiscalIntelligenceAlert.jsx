import { Alert, Space, Tag, Typography } from "antd";
import SimplesApuracaoResumo from "../../../components/SimplesApuracaoResumo";

const { Text } = Typography;

const colors = {
  azul: "#3B82F6",
  verde: "#1A7A4A",
  laranja: "#B45309",
  vermelho: "#B91C1C",
  texto: "#10233C",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
};

function renderItem(item) {
  if (!item) return null;
  return (
    <span key={`${item.campo}-${item.titulo}`}>
      <Text strong style={{ color: colors.texto }}>
        {item.titulo}
      </Text>
      {item.detalhe ? <Text type="secondary"> {item.detalhe}</Text> : null}
    </span>
  );
}

export default function FiscalIntelligenceAlert({ impostos }) {
  const motor = impostos?.motor_fiscal;
  if (!motor) return null;

  const riscos = motor.riscos || [];
  const alertas = motor.alertas || [];
  const recomendacoes = motor.recomendacoes || [];
  const automacoes = motor.automacoes_aplicadas || [];
  const type = riscos.length ? "error" : alertas.length ? "warning" : "success";

  return (
    <Alert
      type={type}
      showIcon
      style={{
        borderRadius: 14,
        marginTop: 12,
        border: `1px solid ${colors.borda}`,
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
      }}
      message={
        <Space wrap size={8}>
          <Text strong style={{ color: colors.texto }}>
            Motor fiscal especialista
          </Text>
          <Tag
            color={motor.confianca >= 80 ? "green" : motor.confianca >= 60 ? "gold" : "red"}
            style={{ borderRadius: 999, paddingInline: 10, fontWeight: 600 }}
          >
            Confiança {motor.confianca}%
          </Tag>
          {motor.tipo_nota_sugerido ? (
            <Tag color="blue" style={{ borderRadius: 999, paddingInline: 10 }}>
              Nota {String(motor.tipo_nota_sugerido).toUpperCase()}
            </Tag>
          ) : null}
          {motor.codigo_servico_sugerido ? (
            <Tag style={{ borderRadius: 999, paddingInline: 10 }}>
              LC 116 {motor.codigo_servico_sugerido}
            </Tag>
          ) : null}
        </Space>
      }
      description={
        <Space direction="vertical" size={6} style={{ marginTop: 4 }}>
          {motor.simples_apuracao ? (
            <SimplesApuracaoResumo
              apuracao={motor.simples_apuracao}
              compact
              style={{ width: "100%" }}
            />
          ) : null}
          {automacoes.map(renderItem)}
          {riscos.map(renderItem)}
          {alertas.map(renderItem)}
          {!riscos.length && !alertas.length ? (
            <span>Cálculo fiscal aplicado automaticamente para esta operação.</span>
          ) : null}
          {recomendacoes.slice(0, 2).map(renderItem)}
          {motor.reforma_tributaria?.status ? (
            <Text type="secondary">
              Reforma Tributária: estrutura preparada para CBS/IBS e transição 2026-2033.
            </Text>
          ) : null}
        </Space>
      }
    />
  );
}
