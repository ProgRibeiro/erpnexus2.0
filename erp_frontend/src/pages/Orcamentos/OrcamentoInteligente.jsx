import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { moneyFormatter, normalizeList, pageStyle, panelStyle } from "./shared";

const { Dragger } = Upload;
const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

function buildFormData(values, files) {
  const formData = new FormData();
  formData.append("cliente", values.cliente || "");
  formData.append("descricao", values.descricao || "");
  formData.append("email_texto", values.email_texto || "");
  formData.append("observacoes_foto", values.observacoes_foto || "");
  files.forEach((file) => {
    formData.append("fotos", file.originFileObj || file);
  });

  [
    "disciplina_tecnica",
    "tipo_intervencao",
    "prioridade_tecnica",
    "local_atendimento",
    "ativo_equipamento",
    "equipamento_marca",
    "equipamento_modelo",
    "equipamento_tag",
    "capacidade_equipamento",
    "sintomas",
    "diagnostico_preliminar",
    "escopo_tecnico",
    "materiais_previstos",
    "medicoes",
    "condicoes_acesso",
    "criterios_aceite",
    "prazo_execucao",
    "garantia",
  ].forEach((field) => {
    formData.append(field, values[field] || "");
  });

  return formData;
}

function formatTipo(tipo) {
  const map = {
    hvac: "HVAC",
    refrigeracao: "Refrigeração",
    eletrica: "Elétrica",
    civil: "Civil",
    manutencao: "Manutenção",
    instalacao: "Instalação",
    outro: "Outro",
  };
  return map[tipo] || tipo || "-";
}

const disciplinaOptions = [
  { label: "HVAC / Climatização", value: "hvac" },
  { label: "Refrigeração comercial", value: "refrigeracao" },
  { label: "Elétrica", value: "eletrica" },
  { label: "Civil / Acabamento", value: "civil" },
  { label: "Manutenção geral", value: "manutencao" },
  { label: "Instalação", value: "instalacao" },
  { label: "Outro", value: "outro" },
];

const tipoIntervencaoOptions = [
  { label: "Diagnóstico", value: "diagnostico" },
  { label: "Corretiva", value: "corretiva" },
  { label: "Preventiva", value: "preventiva" },
  { label: "Instalação", value: "instalacao" },
  { label: "Substituição", value: "substituicao" },
  { label: "Adequação", value: "adequacao" },
  { label: "Laudo técnico", value: "laudo" },
];

const prioridadeTecnicaOptions = [
  { label: "Programada", value: "media" },
  { label: "Alta", value: "alta" },
  { label: "Emergencial", value: "urgente" },
];

const technicalTemplates = [
  {
    key: "hvac-corretiva",
    label: "HVAC corretiva",
    values: {
      disciplina_tecnica: "hvac",
      tipo_intervencao: "corretiva",
      prioridade_tecnica: "alta",
      ativo_equipamento: "Sistema de climatização / split",
      sintomas: "Baixa performance térmica, gotejamento, ruído anormal ou falha intermitente informada pelo cliente.",
      diagnostico_preliminar: "Necessário diagnóstico em evaporadora, condensadora, dreno, alimentação elétrica e parâmetros de operação.",
      escopo_tecnico:
        "Inspecionar evaporadora e condensadora; verificar dreno, filtros, serpentina, ventiladores e conexões elétricas; realizar testes de tensão, corrente, temperatura de insuflamento/retorno e operação final.",
      materiais_previstos: "Produtos de limpeza técnica, abraçadeiras, mangueira de dreno, isolante térmico, terminais elétricos e peças conforme diagnóstico.",
      medicoes: "Tensão, corrente, temperatura de retorno, temperatura de insuflamento, diferencial térmico e condição visual das serpentinas.",
      condicoes_acesso: "Confirmar acesso à evaporadora, condensadora, ponto elétrico e liberação do ambiente para teste operacional.",
      criterios_aceite: "Equipamento operando sem vazamento aparente, drenagem normal, diferencial térmico validado e teste funcional aprovado.",
      prazo_execucao: "Até 2 dias úteis após aprovação e disponibilidade de acesso.",
      garantia: "90 dias para mão de obra executada, conforme condições de uso e escopo aprovado.",
    },
  },
  {
    key: "refrigeracao",
    label: "Refrigeração",
    values: {
      disciplina_tecnica: "refrigeracao",
      tipo_intervencao: "corretiva",
      prioridade_tecnica: "urgente",
      ativo_equipamento: "Câmara fria / balcão refrigerado / freezer",
      sintomas: "Temperatura fora da faixa, formação excessiva de gelo, compressor armando/desarmando ou equipamento parado.",
      diagnostico_preliminar: "Verificar sistema frigorífico, degelo, ventilação interna, vedação, controle de temperatura e alimentação elétrica.",
      escopo_tecnico:
        "Inspecionar unidade condensadora e evaporadora; testar controlador, sensores, ventiladores, degelo e compressor; medir temperatura, tensão, corrente e pressão quando aplicável.",
      materiais_previstos: "Sensor, controlador, contator, relé, fluido refrigerante, filtro secador, isolantes e componentes conforme diagnóstico.",
      medicoes: "Temperatura interna, setpoint, tensão, corrente, pressão de sucção/descarga quando aplicável e ciclo de degelo.",
      condicoes_acesso: "Necessária liberação do equipamento, acesso à casa de máquinas e janela para teste sem abertura constante de portas.",
      criterios_aceite: "Temperatura em tendência de estabilização, controlador operando, ventilação normal e ciclo de refrigeração validado.",
      prazo_execucao: "Atendimento prioritário conforme janela operacional do cliente.",
      garantia: "90 dias para mão de obra; peças conforme garantia do fabricante.",
    },
  },
  {
    key: "eletrica",
    label: "Elétrica",
    values: {
      disciplina_tecnica: "eletrica",
      tipo_intervencao: "adequacao",
      prioridade_tecnica: "alta",
      ativo_equipamento: "Quadro elétrico / circuito / ponto de alimentação",
      sintomas: "Disjuntor desarmando, aquecimento, falta de alimentação, tomada sem tensão ou necessidade de adequação.",
      diagnostico_preliminar: "Inspeção de carga, proteção, cabeamento, conexões, aterramento e compatibilidade do circuito.",
      escopo_tecnico:
        "Identificar circuito; medir tensão e corrente; avaliar proteção; reapertar conexões quando aplicável; substituir componente danificado; testar energização e registrar condição final.",
      materiais_previstos: "Disjuntores, cabos, conectores, terminais, tomadas, eletrodutos, identificação e acessórios conforme diagnóstico.",
      medicoes: "Tensão fase-neutro/fase-fase, corrente do circuito, continuidade, condição visual dos condutores e aquecimento aparente.",
      condicoes_acesso: "Pode exigir desligamento parcial, acesso ao quadro e autorização do responsável local.",
      criterios_aceite: "Circuito energizado com proteção compatível, conexões seguras, sem aquecimento aparente e teste funcional aprovado.",
      prazo_execucao: "Conforme janela de desligamento autorizada pelo cliente.",
      garantia: "90 dias para mão de obra executada.",
    },
  },
  {
    key: "civil",
    label: "Civil",
    values: {
      disciplina_tecnica: "civil",
      tipo_intervencao: "corretiva",
      prioridade_tecnica: "media",
      ativo_equipamento: "Área civil / acabamento / infraestrutura",
      sintomas: "Infiltração, trinca, dano em acabamento, porta desalinhada, forro danificado ou adequação solicitada.",
      diagnostico_preliminar: "Avaliar causa provável, extensão da área afetada, material existente e interferências com operação do ambiente.",
      escopo_tecnico:
        "Isolar área; preparar superfície; executar correção civil; aplicar acabamento compatível; limpar área; registrar antes/depois e liberar para conferência.",
      materiais_previstos: "Massa, argamassa, tinta, gesso, silicone, parafusos, ferragens, revestimentos e insumos conforme vistoria.",
      medicoes: "Área estimada, dimensão do trecho afetado, nível de acabamento, cor/referência e necessidade de proteção do ambiente.",
      condicoes_acesso: "Confirmar horário permitido, isolamento da área, proteção de mobiliário e restrição de ruído/poeira.",
      criterios_aceite: "Acabamento regular, área limpa, correção funcional validada e fotos finais anexadas.",
      prazo_execucao: "Conforme secagem de materiais e liberação do ambiente.",
      garantia: "90 dias para mão de obra, exceto reincidência por causa externa não tratada.",
    },
  },
];

const sectionTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#10233C",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.02em",
  marginBottom: 14,
};

const sectionStyle = {
  border: "1px solid #E2E6EC",
  borderRadius: 14,
  padding: 18,
  background: "#FFFFFF",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
};

const metricStyle = {
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  padding: "14px 16px",
  background: "#F8FAFD",
};

function Section({ icon, title, children }) {
  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

export default function OrcamentoInteligente() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [clientes, setClientes] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [analisando, setAnalisando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [sugestao, setSugestao] = useState(null);

  useEffect(() => {
    buscarClientes("");
  }, []);

  async function buscarClientes(search) {
    try {
      setClientesLoading(true);
      const response = await api.get("/clientes/", { params: search ? { search } : {} });
      setClientes(normalizeList(response.data));
    } catch {
      setClientes([]);
    } finally {
      setClientesLoading(false);
    }
  }

  async function analisar() {
    try {
      const values = await form.validateFields();
      setAnalisando(true);
      const response = await api.post("/ordens/motor-orcamento/analisar/", buildFormData(values, files), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSugestao(response.data);
      message.success("Sugestão gerada.");
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.detail || "Não foi possível analisar a entrada.");
    } finally {
      setAnalisando(false);
    }
  }

  async function criarOrcamento() {
    try {
      const values = await form.validateFields();
      setCriando(true);
      const response = await api.post("/ordens/motor-orcamento/criar/", buildFormData(values, files), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success("Orçamento rascunho criado.");
      navigate(`/orcamentos/${response.data?.ordem?.id}`);
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.detail || "Não foi possível criar o orçamento.");
    } finally {
      setCriando(false);
    }
  }

  const clienteOptions = useMemo(
    () =>
      clientes.map((cliente) => ({
        label: cliente.nome || cliente.razao_social || `Cliente #${cliente.id}`,
        value: cliente.id,
      })),
    [clientes],
  );

  const watchedValues = Form.useWatch([], form) || {};
  const filledTechnicalFields = [
    "disciplina_tecnica",
    "tipo_intervencao",
    "local_atendimento",
    "ativo_equipamento",
    "sintomas",
    "diagnostico_preliminar",
    "escopo_tecnico",
    "materiais_previstos",
    "medicoes",
    "criterios_aceite",
  ].filter((field) => String(watchedValues[field] || "").trim()).length;
  const technicalCompleteness = Math.round((filledTechnicalFields / 10) * 100);

  function aplicarModelo(values) {
    form.setFieldsValue(values);
    message.success("Modelo técnico aplicado.");
  }

  const briefingPreview = [
    watchedValues.tipo_intervencao && tipoIntervencaoOptions.find((item) => item.value === watchedValues.tipo_intervencao)?.label,
    watchedValues.ativo_equipamento,
    watchedValues.local_atendimento && `em ${watchedValues.local_atendimento}`,
  ]
    .filter(Boolean)
    .join(" ");

  const formTabs = [
    {
      key: "diagnostico",
      label: "Diagnóstico",
      children: (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Section icon={<FileSearchOutlined style={{ color: "#3B82F6" }} />} title="Pedido e contexto">
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item name="cliente" label="Cliente" rules={[{ required: true, message: "Selecione um cliente." }]}>
                  <Select
                    showSearch
                    allowClear
                    filterOption={false}
                    loading={clientesLoading}
                    options={clienteOptions}
                    placeholder="Selecione o cliente"
                    onSearch={buscarClientes}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="disciplina_tecnica" label="Disciplina">
                  <Select options={disciplinaOptions} placeholder="Área técnica" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="tipo_intervencao" label="Intervenção">
                  <Select options={tipoIntervencaoOptions} placeholder="Tipo" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col xs={24} md={8}>
                <Form.Item name="prioridade_tecnica" label="Prioridade">
                  <Select options={prioridadeTecnicaOptions} placeholder="Programada" />
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="local_atendimento" label="Local / ambiente">
                  <Input placeholder="Loja, sala, casa de máquinas, cobertura, área técnica" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="descricao"
              label="Solicitação do cliente"
              rules={[{ required: true, message: "Informe a solicitação do cliente." }]}
            >
              <TextArea rows={4} placeholder="Pedido original do cliente, contexto comercial e restrições conhecidas." />
            </Form.Item>
          </Section>

          <Section icon={<BuildOutlined style={{ color: "#10B981" }} />} title="Ativo técnico">
            <Row gutter={12}>
              <Col xs={24} md={10}>
                <Form.Item name="ativo_equipamento" label="Ativo / equipamento">
                  <Input placeholder="Split hi-wall, câmara fria, QGBT, porta, forro" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="capacidade_equipamento" label="Capacidade / carga">
                  <Input placeholder="24.000 BTU, 5 TR, 220 V" />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item name="equipamento_marca" label="Marca">
                  <Input placeholder="Marca" />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item name="equipamento_modelo" label="Modelo">
                  <Input placeholder="Modelo" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col xs={24} md={8}>
                <Form.Item name="equipamento_tag" label="Tag / série">
                  <Input placeholder="AC-03, QD-01, série" />
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="sintomas" label="Sintomas observados">
                  <TextArea rows={3} placeholder="Falha relatada, comportamento do equipamento, recorrência e impacto operacional." />
                </Form.Item>
              </Col>
            </Row>
          </Section>
        </Space>
      ),
    },
    {
      key: "escopo",
      label: "Escopo",
      children: (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Section icon={<ToolOutlined style={{ color: "#F59E0B" }} />} title="Diagnóstico e execução">
            <Form.Item name="diagnostico_preliminar" label="Diagnóstico preliminar">
              <TextArea rows={4} placeholder="Hipótese técnica, componentes suspeitos e verificações necessárias." />
            </Form.Item>
            <Form.Item name="escopo_tecnico" label="Escopo técnico proposto">
              <TextArea rows={6} placeholder="Etapas objetivas da execução, testes, desmontagens, correções, recomissionamento e registro fotográfico." />
            </Form.Item>
          </Section>

          <Section icon={<ExperimentOutlined style={{ color: "#8B5CF6" }} />} title="Materiais e medições">
            <Form.Item name="materiais_previstos" label="Materiais, peças e insumos previstos">
              <TextArea rows={4} placeholder="Peças, consumíveis, ferramentas especiais e itens que podem variar após diagnóstico." />
            </Form.Item>
            <Form.Item name="medicoes" label="Medições e parâmetros técnicos">
              <TextArea rows={4} placeholder="Tensão, corrente, pressão, temperatura, área, dimensão, setpoint, diferencial térmico ou outros parâmetros." />
            </Form.Item>
          </Section>
        </Space>
      ),
    },
    {
      key: "comercial",
      label: "Condições",
      children: (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Section icon={<SafetyCertificateOutlined style={{ color: "#0EA5E9" }} />} title="Aceite e premissas">
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item name="condicoes_acesso" label="Condições de acesso">
                  <TextArea rows={4} placeholder="Escada, altura, desligamento, área isolada, horário especial, liberação de loja ou acompanhamento." />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="criterios_aceite" label="Critérios de aceite">
                  <TextArea rows={4} placeholder="Condição técnica final que valida a entrega para cliente e operação." />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item name="prazo_execucao" label="Prazo de execução">
                  <Input placeholder="Até 2 dias úteis, janela noturna, após chegada de peça" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="garantia" label="Garantia técnica">
                  <Input placeholder="90 dias para mão de obra, peças conforme fabricante" />
                </Form.Item>
              </Col>
            </Row>
          </Section>

          <Section icon={<InboxOutlined style={{ color: "#64748B" }} />} title="Evidências e origem">
            <Form.Item name="email_texto" label="Texto do e-mail / WhatsApp">
              <TextArea rows={4} placeholder="Mensagem original do cliente, aprovação interna, solicitação do shopping ou histórico relevante." />
            </Form.Item>
            <Form.Item name="observacoes_foto" label="Observações das fotos">
              <TextArea rows={3} placeholder="O que aparece nas imagens: vazamento, oxidação, dano, acesso, etiqueta, componente afetado." />
            </Form.Item>

            <Dragger
              multiple
              accept="image/*"
              fileList={files}
              beforeUpload={() => false}
              onChange={({ fileList }) => setFiles(fileList)}
              style={{ borderRadius: 10, background: "#F8FAFC" }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Fotos do chamado</p>
            </Dragger>
          </Section>
        </Space>
      ),
    },
  ];

  const columns = [
    {
      title: "Origem",
      dataIndex: "origem_tipo",
      width: 110,
      render: (value) => {
        const color = value === "produto" ? "blue" : value === "servico" ? "green" : "default";
        return <Tag color={color}>{value === "produto" ? "Produto" : value === "servico" ? "Serviço" : "Avulso"}</Tag>;
      },
    },
    {
      title: "Descrição",
      dataIndex: "descricao",
      render: (value, record) => (
        <div>
          <Text strong>{value}</Text>
          {record.motivo_sugestao && (
            <div style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>{record.motivo_sugestao}</div>
          )}
          {record.fonte_preco_label && (
            <Space size={6} wrap style={{ marginTop: 8 }}>
              <Tag color="geekblue">{record.fonte_preco_label}</Tag>
              {record.componente_custo_label ? <Tag color="purple">{record.componente_custo_label}</Tag> : null}
              {record.codigo_fonte_preco ? <Tag>{record.codigo_fonte_preco}</Tag> : null}
              {record.confianca_preco ? <Tag color="green">Preço {record.confianca_preco}%</Tag> : null}
            </Space>
          )}
          {record.memoria_calculo && (
            <div style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>
              {record.memoria_calculo}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Qtd",
      dataIndex: "quantidade",
      align: "right",
      width: 90,
      render: (value) => Number(value || 0).toLocaleString("pt-BR"),
    },
    {
      title: "Unitário",
      dataIndex: "valor_unitario",
      align: "right",
      width: 130,
      render: (value) => moneyFormatter.format(Number(value || 0)),
    },
    {
      title: "Total",
      align: "right",
      width: 130,
      render: (_, record) => moneyFormatter.format(Number(record.quantidade || 0) * Number(record.valor_unitario || 0)),
    },
  ];

  return (
    <div style={pageStyle}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <Space align="start">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/orcamentos")}
              style={{ borderRadius: 10, height: 40, width: 40 }}
            />
            <div>
              <Text style={{ color: "#8A97AA", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Motor de orçamento inteligente
              </Text>
              <Title level={1} style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 800, color: "#10233C" }}>
                Modelo Técnico de Orçamento
              </Title>
              <Text style={{ color: "#5A6070" }}>Diagnóstico, escopo, materiais, medições, aceite e condições comerciais</Text>
            </div>
          </Space>
          <Space wrap>
            <Button
              icon={<FileSearchOutlined />}
              loading={analisando}
              onClick={analisar}
              style={{ borderRadius: 10, height: 40, fontWeight: 600, paddingInline: 18 }}
            >
              Analisar
            </Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={criando}
              disabled={!sugestao}
              onClick={criarOrcamento}
              style={{ background: "#3B82F6", borderColor: "#3B82F6", borderRadius: 10, height: 40, fontWeight: 600, paddingInline: 20 }}
            >
              Criar orçamento
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[20, 20]} align="top">
        <Col xs={24} xl={6}>
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <Card
              bordered={false}
              style={panelStyle}
              bodyStyle={{ padding: 18 }}
              title={<span style={{ fontWeight: 700, color: "#10233C" }}>Modelos rápidos</span>}
            >
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                {technicalTemplates.map((template) => (
                  <Button
                    key={template.key}
                    block
                    icon={<ToolOutlined style={{ color: "#3B82F6" }} />}
                    onClick={() => aplicarModelo(template.values)}
                    style={{
                      justifyContent: "flex-start",
                      height: 42,
                      borderRadius: 10,
                      color: "#10233C",
                      fontWeight: 600,
                      border: "1px solid #E2E6EC",
                    }}
                  >
                    {template.label}
                  </Button>
                ))}
              </Space>
            </Card>

            <Card
              bordered={false}
              style={panelStyle}
              bodyStyle={{ padding: 18 }}
              title={<span style={{ fontWeight: 700, color: "#10233C" }}>Resumo do briefing</span>}
            >
              <Space direction="vertical" size={14} style={{ width: "100%" }}>
                <div style={metricStyle}>
                  <Text style={{ color: "#5A6070", fontSize: 12, fontWeight: 600 }}>Completude técnica</Text>
                  <Progress percent={technicalCompleteness} size="small" strokeColor="#3B82F6" />
                </div>
                <div style={metricStyle}>
                  <Text style={{ color: "#5A6070", fontSize: 12, fontWeight: 600 }}>Modelo</Text>
                  <div style={{ color: "#10233C", fontWeight: 800, marginTop: 4 }}>
                    {formatTipo(watchedValues.disciplina_tecnica) || "Sem disciplina"}
                  </div>
                </div>
                <div style={metricStyle}>
                  <Text style={{ color: "#5A6070", fontSize: 12, fontWeight: 600 }}>Chamada técnica</Text>
                  <Paragraph style={{ margin: "6px 0 0", color: "#334155" }}>
                    {briefingPreview || "Aguardando dados do ativo e intervenção."}
                  </Paragraph>
                </div>
              </Space>
            </Card>
          </Space>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            bordered={false}
            style={panelStyle}
            bodyStyle={{ padding: 20 }}
            title={<span style={{ fontWeight: 700, color: "#10233C" }}>Preenchimento técnico</span>}
          >
            <Form form={form} layout="vertical">
              <Tabs items={formTabs} />
              <Button
                block
                type="primary"
                icon={<FileSearchOutlined />}
                loading={analisando}
                onClick={analisar}
                style={{ background: "#3B82F6", borderColor: "#3B82F6", borderRadius: 10, fontWeight: 600, height: 42, marginTop: 8 }}
              >
                Gerar sugestão técnica
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={6}>
          <Card
            bordered={false}
            style={panelStyle}
            bodyStyle={{ padding: 18 }}
            title={<span style={{ fontWeight: 700, color: "#10233C" }}>Prévia gerada</span>}
          >
            {!sugestao ? (
              <div style={{ padding: "36px 8px", color: "#5A6070", textAlign: "center" }}>
                <ThunderboltOutlined style={{ color: "#3B82F6", fontSize: 32, marginBottom: 12, display: "block" }} />
                <Paragraph style={{ margin: 0 }}>
                  A prévia técnica aparece após a análise.
                </Paragraph>
              </div>
            ) : (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Row gutter={[10, 10]}>
                  <Col span={12}>
                    <div style={metricStyle}>
                      <Text style={{ color: "#5A6070", fontSize: 12, fontWeight: 600 }}>Tipo</Text>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#10233C", marginTop: 4 }}>{formatTipo(sugestao.tipo_servico)}</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={metricStyle}>
                      <Text style={{ color: "#5A6070", fontSize: 12, fontWeight: 600 }}>Confiança</Text>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#10233C", marginTop: 4 }}>{Number(sugestao.confianca || 0)}%</div>
                    </div>
                  </Col>
                  <Col span={24}>
                    <div style={metricStyle}>
                      <Text style={{ color: "#5A6070", fontSize: 12, fontWeight: 600 }}>Subtotal</Text>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#3B82F6", marginTop: 4 }}>{moneyFormatter.format(Number(sugestao.subtotal || 0))}</div>
                    </div>
                  </Col>
                </Row>

                <Alert
                  type="info"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  message="Escopo técnico"
                  description={<Paragraph style={{ margin: 0, whiteSpace: "pre-line" }}>{sugestao.descricao_servico}</Paragraph>}
                  style={{ borderRadius: 12 }}
                />

                {sugestao.briefing_tecnico && Object.keys(sugestao.briefing_tecnico).length > 0 && (
                  <div style={sectionStyle}>
                    <div style={sectionTitleStyle}>
                      <ClockCircleOutlined style={{ color: "#3B82F6" }} />
                      Briefing aplicado
                    </div>
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      {Object.entries(sugestao.briefing_tecnico).map(([key, value]) => (
                        <div key={key} style={{ borderBottom: "1px solid #E2E6EC", paddingBottom: 6 }}>
                          <Text style={{ color: "#8A97AA", fontSize: 12, fontWeight: 600 }}>{key}</Text>
                          <div style={{ color: "#10233C", fontWeight: 700 }}>{value}</div>
                        </div>
                      ))}
                    </Space>
                  </div>
                )}

                {sugestao.avisos?.map((aviso) => (
                  <Alert key={aviso} type="warning" showIcon message={aviso} style={{ borderRadius: 12 }} />
                ))}

                {sugestao.referencias_preco?.length > 0 && (
                  <div style={sectionStyle}>
                    <div style={sectionTitleStyle}>
                      <SafetyCertificateOutlined style={{ color: "#10B981" }} />
                      Base de preços
                    </div>
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                      {sugestao.referencias_preco.slice(0, 4).map((ref) => (
                        <div key={`${ref.codigo}-${ref.valor_sugerido}`} style={{ borderBottom: "1px solid #E2E6EC", paddingBottom: 8 }}>
                          <Text strong style={{ color: "#10233C" }}>{ref.descricao}</Text>
                          <div style={{ color: "#5A6070", fontSize: 12, marginTop: 3 }}>
                            {ref.fonte} · {ref.componente_custo || "Composição"} · base {moneyFormatter.format(Number(ref.base || 0))} · margem {ref.margem}% · fator {ref.fator}
                          </div>
                          {ref.base_legal ? (
                            <div style={{ color: "#8A97AA", fontSize: 11, marginTop: 3 }}>
                              {ref.base_legal}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </Space>
                  </div>
                )}

                {sugestao.metodologia_calculo?.length > 0 && (
                  <Alert
                    type="success"
                    showIcon
                    message="Planilha de Custos e Formação de Preços"
                    description={
                      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                        {sugestao.metodologia_calculo.slice(0, 3).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    }
                    style={{ borderRadius: 12 }}
                  />
                )}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {sugestao && (
        <Card
          bordered={false}
          style={panelStyle}
          bodyStyle={{ padding: 20 }}
          title={<span style={{ fontWeight: 700, color: "#10233C" }}>Composição sugerida</span>}
        >
          <Table
            columns={columns}
            dataSource={sugestao.itens || []}
            rowKey={(record, index) => `${record.origem_tipo}-${record.codigo_referencia}-${index}`}
            pagination={false}
            scroll={{ x: 760 }}
          />
        </Card>
      )}
    </div>
  );
}
