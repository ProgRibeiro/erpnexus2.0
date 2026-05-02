import { useState } from "react";
import { Button, Modal, Tabs, Upload, message, Spin, Result, Row, Col } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import api from "../../services/api";

const { Dragger } = Upload;

export default function ExcelImportModal({ open, onClose, onSuccess }) {
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [tipoImport, setTipoImport] = useState("clientes");
  const [arquivo, setArquivo] = useState(null);

  const endpoints = {
    clientes: "/estoque/excel-import/importar-clientes/",
    servicos: "/estoque/excel-import/importar-servicos/",
    produtos: "/estoque/excel-import/importar-produtos/",
  };

  const templates = {
    clientes: [
      "Nome Fantasia",
      "Razão Social",
      "CNPJ",
      "Telefone",
      "Email",
      "Segmento",
      "Status",
      "Cidade",
      "UF",
    ],
    servicos: ["Nome", "Descrição", "Categoria", "Preço", "Tributação", "LC116", "Unidade"],
    produtos: ["Nome", "Descrição", "Categoria", "Unidade", "Custo", "Venda", "Mín.", "Local"],
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
      message.success(`${response.data.sucesso} registros importados!`);
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
          <p>Colunas esperadas: {templates.clientes.join(", ")}</p>
          <Dragger
            accept=".xlsx"
            maxCount={1}
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
          <p>Colunas esperadas: {templates.servicos.join(", ")}</p>
          <Dragger
            accept=".xlsx"
            maxCount={1}
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
          <p>Colunas esperadas: {templates.produtos.join(", ")}</p>
          <Dragger
            accept=".xlsx"
            maxCount={1}
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
      title="Importar dados via Excel"
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
          style={{ background: "#1B4F8A", borderColor: "#1B4F8A" }}
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
              resultado.erros.length > 0 && (
                <div style={{ textAlign: "left", marginTop: 16 }}>
                  <h4>Erros encontrados:</h4>
                  <div style={{ maxHeight: 200, overflow: "auto", fontSize: 12 }}>
                    {resultado.erros.map((erro, idx) => (
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
            style={{ marginTop: 16 }}
          />
        )}
      </Spin>
    </Modal>
  );
}
