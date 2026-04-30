import { useEffect, useState } from "react";
import { Button, Card, Space, Table, Tag, Typography, message, Spin } from "antd";
import { FilePdfOutlined, FileTextOutlined } from "@ant-design/icons";

import ordemService from "../services/ordemService";
import api from "../services/api";

const colorByStatus = {
  aberta: "blue",
  em_andamento: "gold",
  aguardando: "orange",
  concluida: "green",
  cancelada: "red",
};

export default function OrdensPage() {
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState({});

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const data = await ordemService.listar();
        setOrdens(data.results ?? data);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, []);

  const relatorioUrl = (record) =>
    `${window.location.origin}/relatorio/${record.token_relatorio}`;

  const copiarLink = async (record) => {
    await navigator.clipboard.writeText(relatorioUrl(record));
    message.success("Link copiado");
  };

  const whatsappLink = (record) =>
    `https://wa.me/?text=${encodeURIComponent(`Relatorio da OS ${record.numero}: ${relatorioUrl(record)}`)}`;

  const gerarPDFRelatorio = async (record) => {
    try {
      setGerandoPDF((prev) => ({ ...prev, [record.id]: "relatorio" }));
      const response = await api.post(`/api/v1/ordens/${record.id}/gerar-pdf-relatorio/`, {}, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `relatorio_${record.numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("Relatório PDF gerado com sucesso");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      message.error("Erro ao gerar PDF de relatório");
    } finally {
      setGerandoPDF((prev) => {
        const newState = { ...prev };
        delete newState[record.id];
        return newState;
      });
    }
  };

  const gerarPDFOrcamento = async (record) => {
    try {
      setGerandoPDF((prev) => ({ ...prev, [record.id]: "orcamento" }));
      const response = await api.post(`/api/v1/ordens/${record.id}/gerar-pdf-orcamento/`, {}, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `orcamento_${record.numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("Orçamento PDF gerado com sucesso");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      message.error("Erro ao gerar PDF de orçamento");
    } finally {
      setGerandoPDF((prev) => {
        const newState = { ...prev };
        delete newState[record.id];
        return newState;
      });
    }
  };

  return (
    <Card>
      <Typography.Title level={3}>Ordens de Servico</Typography.Title>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={ordens}
        columns={[
          { title: "Numero", dataIndex: "numero" },
          { title: "Cliente", dataIndex: "cliente_nome" },
          {
            title: "Status",
            dataIndex: "status",
            render: (status) => <Tag color={colorByStatus[status]}>{status}</Tag>,
          },
          { title: "Valor", dataIndex: "valor_total_orcado" },
          {
            title: "Ações PDF",
            render: (_, record) => (
              <Space>
                <Button
                  size="small"
                  icon={<FilePdfOutlined />}
                  loading={gerandoPDF[record.id] === "relatorio"}
                  onClick={() => gerarPDFRelatorio(record)}
                >
                  {gerandoPDF[record.id] === "relatorio" ? "Gerando..." : "Relatório"}
                </Button>
                <Button
                  size="small"
                  icon={<FileTextOutlined />}
                  loading={gerandoPDF[record.id] === "orcamento"}
                  onClick={() => gerarPDFOrcamento(record)}
                >
                  {gerandoPDF[record.id] === "orcamento" ? "Gerando..." : "Orçamento"}
                </Button>
              </Space>
            ),
          },
          {
            title: "Relatorio",
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => copiarLink(record)}>Copiar link</Button>
                <Button size="small" href={whatsappLink(record)} target="_blank">WhatsApp</Button>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}
