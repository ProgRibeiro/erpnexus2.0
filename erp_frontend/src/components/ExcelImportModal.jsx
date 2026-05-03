import { useState } from "react";
import { Button, Modal, Tabs, Upload, message, Spin, Result, Row, Col } from "antd";
import { InboxOutlined, DownloadOutlined } from "@ant-design/icons";
import api from "../services/api";

const { Dragger } = Upload;

export default function ExcelImportModal({ open, onClose, onSuccess }) {
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [tipoImport, setTipoImport] = useState("clientes");
  const [arquivo, setArquivo] = useState(null);

  const endpoints = {
    clientes: "/importacao/clientes/importar/",
    servicos: "/importacao/servicos/importar/",
    produtos: "/importacao/produtos/importar/",
  };

  const exportEndpoints = {
    clientes: "/importacao/clientes/exportar/",
    servicos: "/importacao/servicos/exportar/",
    produtos: "/importacao/produtos/exportar/",
    ordens: "/importacao/ordens/exportar/",
    financeiro: "/importacao/financeiro/exportar/",
  };

  const templates = {
    clientes: [
      "nome",
      "cnpj_cpf",
      "email",
      "telefone",
      "status",
      "segmento",
    ],
    servicos: ["codigo", "nome", "descricao", "categoria", "unidade_medida", "preco_padrao", "tributacao", "codigo_lc116", "ativo"],
    produtos: ["codigo", "nome", "descricao", "unidade_medida", "preco_custo", "preco_venda", "estoque_minimo", "ativo"],
  };

  const handleExport = async (tipo) => {
    try {
      const response = await api.get(exportEndpoints[tipo], {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${tipo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("Arquivo exportado.");
    } catch {
      message.error("Erro ao exportar dados");
    }
  };

  const handleImport = async () => {
    if (!arquivo) {
      message.warning("Selecione um arquivo");
      return;
    }

    setImportando(true);
    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
      const response = await api.post(endpoints[tipoImport], formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResultado(response.data);
      message.success(`${response.data.sucesso || 0} registros processados.`);
      if (onSuccess) onSuccess();
    } catch {
      message.error("Erro ao importar arquivo");
    } finally {
      setImportando(false);
    }
  };

  const handleClose = () => {
    setArquivo(null);
    setResultado(null);
    setImportando(false);
    onClose();
  };

  const tabs = [
    {
      key: "clientes",
      label: "Clientes",
      children: (
        <div>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0 }}>Colunas: {templates.clientes.join(", ")}</p>
            <Button icon={<DownloadOutlined />} onClick={() => handleExport("clientes")} size="small">
              Exportar
            </Button>
          </div>
          <Dragger
            accept=".xlsx"
            maxCount={1}
            beforeUpload={() => false}
            onChange={(info) => setArquivo(info.fileList[0]?.originFileObj)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Clique ou arraste um arquivo Excel</p>
          </Dragger>
        </div>
      ),
    },
    {
      key: "servicos",
      label: "Serviços",
      children: (
        <div>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0 }}>Colunas: {templates.servicos.join(", ")}</p>
            <Button icon={<DownloadOutlined />} onClick={() => handleExport("servicos")} size="small">
              Exportar
            </Button>
          </div>
          <Dragger
            accept=".xlsx"
            maxCount={1}
            beforeUpload={() => false}
            onChange={(info) => setArquivo(info.fileList[0]?.originFileObj)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Clique ou arraste um arquivo Excel</p>
          </Dragger>
        </div>
      ),
    },
    {
      key: "produtos",
      label: "Produtos",
      children: (
        <div>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0 }}>Colunas: {templates.produtos.join(", ")}</p>
            <Button icon={<DownloadOutlined />} onClick={() => handleExport("produtos")} size="small">
              Exportar
            </Button>
          </div>
          <Dragger
            accept=".xlsx"
            maxCount={1}
            beforeUpload={() => false}
            onChange={(info) => setArquivo(info.fileList[0]?.originFileObj)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Clique ou arraste um arquivo Excel</p>
          </Dragger>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title="Importação e exportação em lote"
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancelar
        </Button>,
        <Button
          key="import"
          type="primary"
          loading={importando}
          onClick={handleImport}
          style={{ background: "#3B82F6", borderColor: "#3B82F6" }}
        >
          Importar
        </Button>,
      ]}
      width={600}
    >
      <Spin spinning={importando} tip="Processando importação...">
        {resultado ? (
          <Result
            status={resultado.falhas === 0 ? "success" : "warning"}
            title={`Importação concluída`}
            subTitle={`Sucesso: ${resultado.sucesso} | Falhas: ${resultado.falhas}`}
            extra={
              (resultado.erros || []).length > 0 && (
                <div style={{ textAlign: "left", marginTop: 16 }}>
                  <h4>Erros encontrados:</h4>
                  <div style={{ maxHeight: 200, overflow: "auto", fontSize: 12 }}>
                    {(resultado.erros || []).map((erro, idx) => (
                      <div key={idx} style={{ color: "#ef4444" }}>
                        {erro}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          />
        ) : (
          <Tabs
            activeKey={tipoImport}
            onChange={setTipoImport}
            items={tabs}
            tabBarExtraContent={
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport("ordens")}>
                  OS
                </Button>
                <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport("financeiro")}>
                  Financeiro
                </Button>
              </div>
            }
            style={{ marginTop: 16 }}
          />
        )}
      </Spin>
    </Modal>
  );
}

