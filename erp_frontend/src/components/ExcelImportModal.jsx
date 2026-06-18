import { useEffect, useState } from "react";
import { Alert, Button, Col, Modal, Progress, Result, Row, Space, Statistic, Tabs, Typography, Upload, message } from "antd";
import { InboxOutlined, DownloadOutlined } from "@ant-design/icons";
import api from "../services/api";

const { Dragger } = Upload;
const { Text } = Typography;

function formatDuration(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes}min ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}

export default function ExcelImportModal({ open, onClose, onSuccess }) {
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [tipoImport, setTipoImport] = useState("clientes");
  const [arquivo, setArquivo] = useState(null);
  const [arquivoNome, setArquivoNome] = useState("");
  const [processo, setProcesso] = useState({
    etapa: "",
    progresso: 0,
    inicio: null,
    duracao: 0,
    detalhe: "",
    erro: "",
  });

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

  useEffect(() => {
    if (!importando || !processo.inicio) return undefined;
    const timer = window.setInterval(() => {
      setProcesso((current) => ({
        ...current,
        duracao: Date.now() - current.inicio,
      }));
    }, 500);
    return () => window.clearInterval(timer);
  }, [importando, processo.inicio]);

  const selecionarArquivo = (info) => {
    const file = info.fileList[0]?.originFileObj || null;
    setArquivo(file);
    setArquivoNome(file?.name || "");
    setResultado(null);
    setProcesso((current) => ({
      ...current,
      etapa: file ? "Arquivo selecionado" : "",
      progresso: file ? 8 : 0,
      detalhe: file ? `${file.name} pronto para importação.` : "",
      erro: "",
    }));
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
    setResultado(null);
    setProcesso({
      etapa: "Preparando arquivo",
      progresso: 12,
      inicio: Date.now(),
      duracao: 0,
      detalhe: arquivoNome ? `Arquivo: ${arquivoNome}` : "Arquivo selecionado.",
      erro: "",
    });
    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
      setProcesso((current) => ({ ...current, etapa: "Enviando para o ERP", progresso: 34 }));
      const response = await api.post(endpoints[tipoImport], formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProcesso((current) => ({ ...current, etapa: "Conferindo resultado", progresso: 82 }));

      setResultado(response.data);
      setProcesso((current) => ({
        ...current,
        etapa: (response.data.falhas || 0) > 0 ? "Importação concluída com avisos" : "Importação concluída",
        progresso: 100,
        duracao: current.inicio ? Date.now() - current.inicio : current.duracao,
        detalhe: `${response.data.sucesso || 0} registro(s) processado(s), ${response.data.falhas || 0} falha(s).`,
        erro: (response.data.falhas || 0) > 0 ? "Algumas linhas não foram importadas. Confira os detalhes abaixo." : "",
      }));
      message.success(`${response.data.sucesso || 0} registros processados.`);
      if (onSuccess) onSuccess();
    } catch (error) {
      const detalhe = error?.response?.data?.detail || error?.response?.data?.erro || "Erro ao importar arquivo";
      setProcesso((current) => ({
        ...current,
        etapa: "Falha na importação",
        progresso: 100,
        duracao: current.inicio ? Date.now() - current.inicio : current.duracao,
        detalhe,
        erro: detalhe,
      }));
      message.error(detalhe);
    } finally {
      setImportando(false);
    }
  };

  const handleClose = () => {
    setArquivo(null);
    setArquivoNome("");
    setResultado(null);
    setImportando(false);
    setProcesso({ etapa: "", progresso: 0, inicio: null, duracao: 0, detalhe: "", erro: "" });
    onClose();
  };

  const painelProcesso = (processo.etapa || arquivoNome) && (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 10,
        border: "1px solid #D7E3F8",
        background: processo.erro ? "#FFF7F7" : "#F8FBFF",
      }}
    >
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Text strong>{processo.etapa || "Arquivo selecionado"}</Text>
          <Text type="secondary">Tempo: {formatDuration(processo.duracao)}</Text>
        </Space>
        <Progress
          percent={processo.progresso}
          status={processo.erro ? "exception" : importando ? "active" : processo.progresso === 100 ? "success" : "normal"}
        />
        <Text type="secondary">{processo.detalhe || (arquivoNome ? `${arquivoNome} pronto para importação.` : "")}</Text>
        {processo.erro && <Alert type="warning" showIcon message={processo.erro} />}
      </Space>
    </div>
  );

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
            accept=".xlsx,.xls,.xlsm,.csv,.txt,.tsv"
            maxCount={1}
            beforeUpload={() => false}
            onChange={selecionarArquivo}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Clique ou arraste uma planilha</p>
          </Dragger>
          {painelProcesso}
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
            accept=".xlsx,.xls,.xlsm,.csv,.txt,.tsv"
            maxCount={1}
            beforeUpload={() => false}
            onChange={selecionarArquivo}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Clique ou arraste uma planilha</p>
          </Dragger>
          {painelProcesso}
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
            accept=".xlsx,.xls,.xlsm,.csv,.txt,.tsv"
            maxCount={1}
            beforeUpload={() => false}
            onChange={selecionarArquivo}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Clique ou arraste uma planilha</p>
          </Dragger>
          {painelProcesso}
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
          disabled={!arquivo}
          onClick={handleImport}
          style={{ background: "#3B82F6", borderColor: "#3B82F6" }}
        >
          Importar
        </Button>,
      ]}
      width={600}
    >
      <div>
        {resultado ? (
          <Result
            status={resultado.falhas === 0 ? "success" : "warning"}
            title="Importação concluída"
            subTitle={`Tempo: ${formatDuration(processo.duracao)} | Sucesso: ${resultado.sucesso} | Falhas: ${resultado.falhas}`}
            extra={
              <Space direction="vertical" size={12} style={{ width: "100%", textAlign: "left" }}>
                <Row gutter={[12, 12]}>
                  <Col span={8}>
                    <Statistic title="Processados" value={resultado.sucesso || 0} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Falhas" value={resultado.falhas || 0} valueStyle={{ color: (resultado.falhas || 0) > 0 ? "#EF4444" : "#10B981" }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Tempo" value={formatDuration(processo.duracao)} />
                  </Col>
                </Row>
                {(resultado.avisos || []).map((aviso) => <Alert key={aviso} type="warning" showIcon message={aviso} />)}
                {(resultado.erros || []).length > 0 && (
                  <div>
                    <Text strong>Erros encontrados:</Text>
                  <div style={{ maxHeight: 200, overflow: "auto", fontSize: 12 }}>
                    {(resultado.erros || []).map((erro, idx) => (
                      <div key={idx} style={{ color: "#ef4444" }}>
                        {erro}
                      </div>
                    ))}
                  </div>
                  </div>
                )}
              </Space>
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
      </div>
    </Modal>
  );
}
