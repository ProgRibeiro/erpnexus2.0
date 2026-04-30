import { Card, Col, Row, Statistic } from "antd";

export default function DashboardPage() {
  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Ordens abertas" value={18} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Clientes ativos" value={245} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Receita do mes" prefix="R$" value={82450} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
