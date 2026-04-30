import { useEffect, useMemo, useState } from "react";
import { Button, Card, Image, Space, Typography } from "antd";
import { useParams } from "react-router-dom";

import ordemService from "../../services/ordemService";

export default function RelatorioPublicoPage() {
  const { token } = useParams();
  const [ordem, setOrdem] = useState(null);

  useEffect(() => {
    ordemService.relatorioPublico(token).then(setOrdem);
  }, [token]);

  const fotosAntes = useMemo(() => (ordem?.fotos || []).filter((foto) => foto.tipo === "antes"), [ordem]);
  const fotosDepois = useMemo(() => (ordem?.fotos || []).filter((foto) => foto.tipo === "depois"), [ordem]);

  return (
    <main className="public-report">
      <Card>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Typography.Title level={2}>{ordem?.numero || "Relatorio"}</Typography.Title>
          <Typography.Text>{ordem?.cliente_nome}</Typography.Text>
          <Typography.Paragraph>{ordem?.descricao_servico}</Typography.Paragraph>
          <Typography.Title level={4}>Fotos antes</Typography.Title>
          <Image.PreviewGroup>
            <Space wrap>{fotosAntes.map((foto) => <Image key={foto.id} width={140} src={foto.arquivo} />)}</Space>
          </Image.PreviewGroup>
          <Typography.Title level={4}>Fotos depois</Typography.Title>
          <Image.PreviewGroup>
            <Space wrap>{fotosDepois.map((foto) => <Image key={foto.id} width={140} src={foto.arquivo} />)}</Space>
          </Image.PreviewGroup>
          <Button type="primary" href={`/api/v1/publico/relatorio/${token}/pdf/`}>
            Baixar PDF
          </Button>
        </Space>
      </Card>
    </main>
  );
}
