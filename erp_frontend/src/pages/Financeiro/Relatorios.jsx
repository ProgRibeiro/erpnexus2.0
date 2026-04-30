import { useEffect, useState } from "react";
import { Card, Col, Descriptions, Row, Statistic, Table, Typography } from "antd";

import financeiroService from "../../services/financeiro";

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function RelatoriosFinanceirosPage() {
  const [dre, setDre] = useState(null);

  useEffect(() => {
    financeiroService.dre().then(setDre);
  }, []);

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Typography.Title level={3}>Relatorios financeiros</Typography.Title>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="DRE simplificado">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Receita bruta">{money(dre?.receita_bruta)}</Descriptions.Item>
            <Descriptions.Item label="Despesas">{money(dre?.despesas)}</Descriptions.Item>
            <Descriptions.Item label="Resultado">{money(dre?.resultado)}</Descriptions.Item>
            <Descriptions.Item label="Margem">{Number(dre?.margem || 0).toFixed(2)}%</Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="Aging de contas a receber">
          <Row gutter={12}>
            <Col span={8}><Statistic title="A vencer" value={money(dre?.aging_receber?.a_vencer)} /></Col>
            <Col span={8}><Statistic title="Ate 30 dias" value={money(dre?.aging_receber?.ate_30)} /></Col>
            <Col span={8}><Statistic title="Vencidos" value={money(dre?.aging_receber?.vencidos)} /></Col>
          </Row>
        </Card>
      </Col>
      <Col span={24}>
        <Card title="Relatorio OS por periodo">
          <Table
            rowKey="status"
            dataSource={dre?.ordens_servico || []}
            columns={[
              { title: "Status", dataIndex: "status" },
              { title: "Total", dataIndex: "total", render: money },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}
