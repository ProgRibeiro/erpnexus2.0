import { Alert, Space, Tag, Typography } from "antd";

const { Text } = Typography;

function renderItem(item) {
  if (!item) return null;
  return (
    <span key={`${item.campo}-${item.titulo}`}>
      <Text strong>{item.titulo}</Text>
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
      style={{ borderRadius: 12, marginTop: 12 }}
      message={
        <Space wrap>
          <span>Motor fiscal especialista</span>
          <Tag color={motor.confianca >= 80 ? "green" : motor.confianca >= 60 ? "gold" : "red"}>
            Confiança {motor.confianca}%
          </Tag>
          {motor.tipo_nota_sugerido ? <Tag color="blue">Nota {String(motor.tipo_nota_sugerido).toUpperCase()}</Tag> : null}
          {motor.codigo_servico_sugerido ? <Tag>LC 116 {motor.codigo_servico_sugerido}</Tag> : null}
        </Space>
      }
      description={
        <Space direction="vertical" size={6}>
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
