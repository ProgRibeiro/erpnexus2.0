import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Checkbox, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Space, Steps, Switch, Table, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, FilePdfOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { money, normalizeList, pageStyle, periodicidadeOptions } from "./shared";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const initialContratoValues = {
  vigencia_meses: 12,
  data_inicio: dayjs(),
  tipo_faturamento: "mensal_fixo",
  dia_vencimento_fatura: 10,
  forma_pagamento: "boleto",
  reajuste_anual: true,
  indice_reajuste: "IPCA",
};

export default function NovoContrato() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [formValues, setFormValues] = useState(initialContratoValues);
  const [clientes, setClientes] = useState([]);
  const [escopos, setEscopos] = useState([]);
  const [checklists, setChecklists] = useState({});
  const [escoposSelecionados, setEscoposSelecionados] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [checklistSelecionado, setChecklistSelecionado] = useState({});
  const [escopoGerado, setEscopoGerado] = useState(null);
  const [erroEscopos, setErroEscopos] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState(""); // "", "salvando", "salvo", "erro"
  const autoSaveTimeoutRef = useRef(null);
  const [contratoIdSalvo, setContratoIdSalvo] = useState(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [clientesRes, escoposRes] = await Promise.all([
          api.get("/clientes/"),
          api.get("/contratos/escopos/"),
        ]);
        setClientes(normalizeList(clientesRes.data));
        const escoposCarregados = normalizeList(escoposRes.data);
        setEscopos(escoposCarregados);
        setErroEscopos(escoposCarregados.length ? "" : "Nenhum escopo técnico foi retornado pela API.");
      } catch (error) {
        setErroEscopos("Não foi possível carregar os escopos técnicos. Verifique se o backend está rodando no tenant demo.localhost.");
        message.warning("Não foi possível carregar dados iniciais.");
      }
    }
    bootstrap();
  }, []);

  useEffect(() => {
    async function gerarEscopoUnificado() {
      if (!escoposSelecionados.length) {
        setEscopoGerado(null);
        return;
      }
      try {
        const res = await api.post("/contratos/escopos/gerar-escopo/", {
          escopos: escoposSelecionados.map((escopo) => escopo.id),
        });
        setEscopoGerado(res.data);
      } catch {
        setEscopoGerado(null);
      }
    }
    gerarEscopoUnificado();
  }, [escoposSelecionados]);

  function montarContratoPayload(values) {
    return {
      cliente: Number(values.cliente),
      titulo: values.titulo,
      objeto_contrato: values.objeto_contrato,
      vigencia_meses: values.vigencia_meses,
      data_inicio: formatarDataInicio(values.data_inicio),
      tipo_faturamento: values.tipo_faturamento,
      dia_vencimento_fatura: values.dia_vencimento_fatura,
      forma_pagamento: values.forma_pagamento,
      reajuste_anual: Boolean(values.reajuste_anual),
      indice_reajuste: values.indice_reajuste || "IPCA",
      renovacao_automatica: Boolean(values.renovacao_automatica),
      requer_art: Boolean(values.requer_art),
      responsavel_tecnico_crea: values.responsavel_tecnico_crea || "",
      observacoes: values.observacoes || "",
    };
  }

  function montarUnidadesPayload() {
    return unidades.map((unidade) => ({
      id: unidade.id,
      nome_unidade: unidade.nome_unidade,
      codigo_interno: unidade.codigo_interno || "",
      endereco_completo: unidade.endereco_completo,
      cep: unidade.cep || "",
      cidade: unidade.cidade || "",
      estado: unidade.estado || "",
      responsavel_local: unidade.responsavel_local || "",
      telefone_local: unidade.telefone_local || "",
      email_local: unidade.email_local || "",
      valor_mensal: unidade.valor_mensal || 0,
      observacoes: unidade.observacoes || "",
      escopos: unidade.escopos.map((escopo) => ({
        ...escopo,
        checklist_ids: checklistSelecionado[escopo.escopo] || [],
      })),
    }));
  }

  async function autoSalvarRascunho() {
    const values = getValoresContrato();
    const temMinimoDados = values.cliente && values.titulo && values.objeto_contrato && unidades.length > 0;

    if (!temMinimoDados) {
      console.log("[AUTOSAVE] Dados insuficientes para salvar rascunho automático");
      return;
    }

    setAutoSaveStatus("salvando");
    try {
      const contratoPayload = montarContratoPayload(values);
      const unidadesPayload = montarUnidadesPayload();

      if (contratoIdSalvo) {
        console.log("[AUTOSAVE] Atualizando contrato completo existente:", contratoIdSalvo);
        await api.post(`/contratos/${contratoIdSalvo}/salvar-completo/`, {
          contrato: contratoPayload,
          unidades: unidadesPayload,
          gerar_pdf: false,
          ativar: false,
        });
      } else {
        console.log("[AUTOSAVE] Criando novo contrato como rascunho");
        const res = await api.post("/contratos/criar-completo/", {
          contrato: contratoPayload,
          unidades: unidadesPayload,
          gerar_pdf: false,
          ativar: false,
        });
        if (res.data?.id) {
          setContratoIdSalvo(res.data.id);
          console.log("[AUTOSAVE] Contrato rascunho salvo com ID:", res.data.id);
        }
      }

      setAutoSaveStatus("salvo");
      setTimeout(() => setAutoSaveStatus(""), 2000);
    } catch (error) {
      console.error("[AUTOSAVE] Erro ao salvar rascunho:", error);
      setAutoSaveStatus("erro");
      setTimeout(() => setAutoSaveStatus(""), 3000);
    }
  }

  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSalvarRascunho();
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [formValues, unidades, checklistSelecionado, escoposSelecionados]);

  async function carregarChecklist(escopoId) {
    if (checklists[escopoId]) return;
    const res = await api.get(`/contratos/escopos/${escopoId}/checklist-padrao/`);
    setChecklists((prev) => ({ ...prev, [escopoId]: res.data || [] }));
    setChecklistSelecionado((prev) => ({
      ...prev,
      [escopoId]: (res.data || []).map((item) => item.id),
    }));
  }

  function toggleEscopo(escopo) {
    setEscoposSelecionados((prev) => {
      const existe = prev.some((item) => item.id === escopo.id);
      if (existe) {
        setChecklistSelecionado((selecionados) => {
          const copia = { ...selecionados };
          delete copia[escopo.id];
          return copia;
        });
        return prev.filter((item) => item.id !== escopo.id);
      }
      carregarChecklist(escopo.id);
      return [...prev, escopo];
    });
  }

  function aplicarEscopoGerado() {
    if (!escopoGerado?.objeto_contrato) return;
    form.setFieldsValue({
      titulo: form.getFieldValue("titulo") || escopoGerado.titulo,
      objeto_contrato: escopoGerado.objeto_contrato,
    });
    message.success("Escopo unificado aplicado ao contrato.");
  }

  function adicionarUnidade() {
    setUnidades((prev) => [
      ...prev,
      {
        key: Date.now(),
        nome_unidade: "",
        endereco_completo: "",
        cidade: "",
        estado: "",
        valor_mensal: 0,
        escopos: escoposSelecionados.map((escopo) => ({
          escopo: escopo.id,
          escopo_nome: escopo.nome,
          periodicidade: "mensal",
          equipamentos_quantidade: 1,
          equipamentos_descricao: "",
          valor_alocado: 0,
        })),
      },
    ]);
  }

  function atualizarUnidade(index, campo, valor) {
    setUnidades((prev) => prev.map((item, idx) => (idx === index ? { ...item, [campo]: valor } : item)));
  }

  function atualizarEscopoUnidade(unidadeIndex, escopoIndex, campo, valor) {
    setUnidades((prev) => prev.map((unidade, idx) => {
      if (idx !== unidadeIndex) return unidade;
      return {
        ...unidade,
        escopos: unidade.escopos.map((escopo, eidx) => (eidx === escopoIndex ? { ...escopo, [campo]: valor } : escopo)),
      };
    }));
  }

  const totalMensal = useMemo(() => unidades.reduce((sum, item) => sum + Number(item.valor_mensal || 0), 0), [unidades]);
  const vigencia = Form.useWatch("vigencia_meses", form) || 12;

  function formatarDataInicio(value) {
    const data = value ? dayjs(value) : dayjs();
    return data.isValid() ? data.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD");
  }

  function getValoresContrato() {
    return {
      ...initialContratoValues,
      ...formValues,
      ...form.getFieldsValue(true),
    };
  }

  async function avancar() {
    try {
      if (step === 0) {
        const values = await form.validateFields(["cliente", "titulo", "objeto_contrato", "data_inicio"]);
        setFormValues((prev) => ({ ...prev, ...form.getFieldsValue(true), ...values }));
      }
      if (step === 1 && !escoposSelecionados.length) {
        message.error("Selecione ao menos um escopo técnico.");
        return;
      }
      if (step === 2 && (!unidades.length || unidades.some((u) => !u.nome_unidade || !u.endereco_completo))) {
        message.error("Informe ao menos uma unidade com nome e endereço.");
        return;
      }
      setStep((s) => Math.min(s + 1, 4));
    } catch {
      message.error("Preencha os campos obrigatórios antes de avançar.");
    }
  }

  function getApiErrorMessage(error) {
    const data = error?.response?.data;
    if (!data) return error?.message || "Erro ao salvar contrato.";
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    if (data.erro) return data.erro;
    const firstKey = Object.keys(data)[0];
    const firstValue = firstKey ? data[firstKey] : null;
    if (Array.isArray(firstValue)) return `${firstKey}: ${firstValue[0]}`;
    if (typeof firstValue === "string") return `${firstKey}: ${firstValue}`;
    return JSON.stringify(data);
  }

  async function salvar(ativar = false, gerarPdf = false) {
    try {
      const values = getValoresContrato();
      console.log("[SAVE] Iniciando salvamento com ativar=", ativar, "gerarPdf=", gerarPdf);
      console.log("[SAVE] Valores do contrato:", values);

      if (!values.cliente) {
        message.error("Selecione o cliente nos dados básicos.");
        setStep(0);
        return;
      }
      if (!values.titulo || !values.objeto_contrato) {
        message.error("Informe título e objeto do contrato.");
        setStep(0);
        return;
      }
      if (!escoposSelecionados.length) {
        message.error("Selecione ao menos um escopo técnico.");
        setStep(1);
        return;
      }
      if (!unidades.length || unidades.some((u) => !u.nome_unidade || !u.endereco_completo)) {
        message.error("Informe ao menos uma unidade com nome e endereço.");
        setStep(2);
        return;
      }

      console.log("[SAVE] Validações passaram. Escopos:", escoposSelecionados.length, "Unidades:", unidades.length);
      console.log("[SAVE] Contrato ID já existente:", contratoIdSalvo);
      setLoading(true);

      const contratoPayload = montarContratoPayload(values);
      const unidadesPayload = montarUnidadesPayload();

      console.log("[SAVE] Payload pronto. Enviando para API...");
      console.log("[SAVE] contratoPayload:", contratoPayload);
      console.log("[SAVE] unidadesPayload:", unidadesPayload);
      console.log("[SAVE] contratoIdSalvo:", contratoIdSalvo, "ativar:", ativar);

      let contratoRes;
      try {
        if (contratoIdSalvo) {
          console.log("[SAVE] Atualizando contrato completo existente:", contratoIdSalvo);
          contratoRes = await api.post(`/contratos/${contratoIdSalvo}/salvar-completo/`, {
            contrato: contratoPayload,
            unidades: unidadesPayload,
            gerar_pdf: gerarPdf,
            ativar,
          });
        } else {
          console.log("[SAVE] Criando novo contrato via POST");
          contratoRes = await api.post("/contratos/criar-completo/", {
            contrato: contratoPayload,
            unidades: unidadesPayload,
            gerar_pdf: gerarPdf,
            ativar,
          });
        }
      } catch (apiError) {
        console.error("[ERROR] Requisição para API falhou completamente:", apiError);
        console.error("[ERROR] Status:", apiError.response?.status);
        console.error("[ERROR] Detalhes:", apiError.response?.data);
        throw apiError;
      }

      if (!contratoRes || !contratoRes.data) {
        throw new Error("API retornou resposta vazia ou inválida.");
      }

      console.log("[SAVE] Resposta da API recebida:", contratoRes.data);
      const contrato = contratoRes.data;

      if (!contrato.id) {
        throw new Error("Contrato criado mas sem ID. Resposta da API: " + JSON.stringify(contrato));
      }

      if (!contratoIdSalvo) {
        setContratoIdSalvo(contrato.id);
        console.log("[SAVE] Novo contrato ID salvo:", contrato.id);
      }

      message.success(ativar ? "Contrato ativado e cronograma gerado." : "Contrato salvo como rascunho.");
      setTimeout(() => navigate(`/contratos/${contrato.id}`), 500);
    } catch (error) {
      console.error("[ERROR] Erro ao salvar contrato:", error);
      console.error("[ERROR] Detalhes do erro:", error.response?.data || error.message);
      message.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const unidadeColumns = [
    { title: "Unidade", render: (_, row, idx) => <Input value={row.nome_unidade} onChange={(e) => atualizarUnidade(idx, "nome_unidade", e.target.value)} placeholder="Loja Iguatemi" /> },
    { title: "Endereço", render: (_, row, idx) => <Input value={row.endereco_completo} onChange={(e) => atualizarUnidade(idx, "endereco_completo", e.target.value)} placeholder="Endereço completo" /> },
    { title: "Cidade", width: 140, render: (_, row, idx) => <Input value={row.cidade} onChange={(e) => atualizarUnidade(idx, "cidade", e.target.value)} /> },
    { title: "UF", width: 80, render: (_, row, idx) => <Input maxLength={2} value={row.estado} onChange={(e) => atualizarUnidade(idx, "estado", e.target.value.toUpperCase())} /> },
    { title: "Valor mensal", width: 160, render: (_, row, idx) => <InputNumber style={{ width: "100%" }} min={0} precision={2} value={row.valor_mensal} onChange={(v) => atualizarUnidade(idx, "valor_mensal", v || 0)} prefix="R$" /> },
  ];

  return (
    <div style={pageStyle}>
      <Space align="center" style={{ justifyContent: "space-between", width: "100%", marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Novo Contrato de Preventiva</Title>
          <Text type="secondary">Wizard em 5 etapas para proposta, contrato e cronograma recorrente</Text>
          {contratoIdSalvo && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              {autoSaveStatus === "salvando" && <Text type="warning">⏳ Salvando rascunho...</Text>}
              {autoSaveStatus === "salvo" && <Text type="success">✓ Rascunho salvo automaticamente</Text>}
              {autoSaveStatus === "erro" && <Text type="danger">✗ Erro ao salvar rascunho</Text>}
              {!autoSaveStatus && <Text type="secondary">ID do rascunho: {contratoIdSalvo}</Text>}
            </div>
          )}
        </div>
        <Button onClick={() => navigate("/contratos")}>Voltar</Button>
      </Space>

      <Card>
        <Steps current={step} items={[
          { title: "Dados básicos" },
          { title: "Escopos" },
          { title: "Unidades" },
          { title: "Checklist" },
          { title: "Revisão" },
        ]} />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Form
          form={form}
          layout="vertical"
          preserve
          initialValues={initialContratoValues}
          onValuesChange={(_, allValues) => setFormValues((prev) => ({ ...prev, ...allValues }))}
        >
          {step === 0 && (
            <>
              <Row gutter={16}>
                <Col xs={24} md={12}><Form.Item name="cliente" label="Cliente" rules={[{ required: true }]}><Select showSearch optionFilterProp="children">{clientes.map((c) => <Select.Option key={c.id} value={c.id}>{c.nome}</Select.Option>)}</Select></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="titulo" label="Título" rules={[{ required: true }]}><Input placeholder="Contrato de Manutenção Preventiva 2026" /></Form.Item></Col>
                <Col xs={24}><Form.Item name="objeto_contrato" label="Objeto do contrato" rules={[{ required: true }]}><TextArea rows={4} placeholder="Descreva o que será feito em todas as unidades..." /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="vigencia_meses" label="Vigência"><Select options={[12, 24, 36].map((v) => ({ value: v, label: `${v} meses` }))} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="data_inicio" label="Início" rules={[{ required: true, message: "Informe a data de início." }]}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="tipo_faturamento" label="Faturamento"><Select options={[{ value: "mensal_fixo", label: "Mensal fixo" }, { value: "por_os_executada", label: "Por OS executada" }, { value: "misto", label: "Misto" }]} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="forma_pagamento" label="Pagamento"><Select options={[{ value: "boleto", label: "Boleto" }, { value: "pix", label: "Pix" }, { value: "transferencia", label: "Transferência" }, { value: "debito_aut", label: "Débito automático" }]} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="dia_vencimento_fatura" label="Dia vencimento"><InputNumber min={1} max={28} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="reajuste_anual" label="Reajuste anual" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="indice_reajuste" label="Índice"><Select options={["IPCA", "IGPM", "INPC", "fixo_percentual"].map((v) => ({ value: v, label: v }))} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="renovacao_automatica" label="Renovação automática" valuePropName="checked"><Switch /></Form.Item></Col>
              </Row>
            </>
          )}

          {step === 1 && (
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={15}>
                {erroEscopos && (
                  <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 12 }}
                    message={erroEscopos}
                    description="No ambiente local com Vite, use o backend em http://demo.localhost:8000 para acessar os dados do tenant."
                  />
                )}
                <Row gutter={[12, 12]}>
                  {escopos.map((escopo) => {
                    const selected = escoposSelecionados.some((item) => item.id === escopo.id);
                    return (
                      <Col xs={24} md={12} key={escopo.id}>
                        <Card hoverable onClick={() => toggleEscopo(escopo)} style={{ borderColor: selected ? escopo.cor : "#E2E8F0", background: selected ? `${escopo.cor}12` : "#fff" }}>
                          <Space direction="vertical" size={4}>
                            <Tag color={escopo.cor}>{escopo.codigo}</Tag>
                            <Text strong>{escopo.nome}</Text>
                            <Text type="secondary">{escopo.norma_tecnica}</Text>
                          </Space>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Col>
              <Col xs={24} lg={9}>
                <Card
                  title="Escopo unificado"
                  extra={escopoGerado ? <Button size="small" onClick={aplicarEscopoGerado}>Aplicar</Button> : null}
                >
                  {!escoposSelecionados.length && <Text type="secondary">Selecione uma ou mais áreas para gerar o escopo.</Text>}
                  {escopoGerado && (
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Paragraph style={{ marginBottom: 0 }}>{escopoGerado.objetivo}</Paragraph>
                      <div>
                        {(escopoGerado.areas_atendidas || []).map((area) => <Tag key={area}>{area}</Tag>)}
                      </div>
                      <Divider style={{ margin: "8px 0" }} />
                      {(escopoGerado.checklist_por_area || []).map((area) => (
                        <div key={area.codigo} style={{ marginBottom: 12 }}>
                          <Text strong>{area.area}</Text>
                          {(area.itens || []).slice(0, 6).map((item) => (
                            <div key={item.id}><CheckCircleOutlined style={{ color: "#10B981" }} /> {item.descricao}</div>
                          ))}
                          {(area.itens || []).length > 6 && <Text type="secondary">+ {(area.itens || []).length - 6} itens</Text>}
                        </div>
                      ))}
                    </Space>
                  )}
                </Card>
              </Col>
            </Row>
          )}

          {step === 2 && (
            <>
              <Alert type="info" showIcon style={{ marginBottom: 12 }} message={`Total mensal atual: ${money.format(totalMensal)} | Total contrato: ${money.format(totalMensal * vigencia)}`} />
              <Button onClick={adicionarUnidade} type="primary" style={{ marginBottom: 12 }}>+ Adicionar unidade</Button>
              <Table rowKey="key" pagination={false} columns={unidadeColumns} dataSource={unidades} scroll={{ x: 900 }} />
              <Divider />
              {unidades.map((unidade, unidadeIndex) => (
                <Card key={unidade.key} size="small" title={`Escopos de ${unidade.nome_unidade || `Unidade ${unidadeIndex + 1}`}`} style={{ marginBottom: 12 }}>
                  <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                    message={`Valor desta unidade: ${money.format(Number(unidade.valor_mensal || 0))}. Os escopos selecionados entram juntos nesse valor mensal.`}
                  />
                  {unidade.escopos.map((escopo, escopoIndex) => (
                    <Row gutter={12} key={escopo.escopo} align="middle" style={{ marginBottom: 8 }}>
                      <Col xs={24} md={10}><Text strong>{escopo.escopo_nome}</Text></Col>
                      <Col xs={24} md={6}>
                        <Select
                          value={escopo.periodicidade}
                          onChange={(v) => atualizarEscopoUnidade(unidadeIndex, escopoIndex, "periodicidade", v)}
                          options={periodicidadeOptions}
                          style={{ width: "100%" }}
                        />
                      </Col>
                      <Col xs={24} md={8}><Text type="secondary">Incluso no valor mensal da unidade</Text></Col>
                    </Row>
                  ))}
                </Card>
              ))}
            </>
          )}

          {step === 3 && (
            <Space direction="vertical" style={{ width: "100%" }}>
              {escopoGerado?.checklist_geral?.length ? (
                <Card title="Checklist geral da preventiva">
                  <Row gutter={[8, 8]}>
                    {escopoGerado.checklist_geral.map((item) => (
                      <Col xs={24} md={12} key={item.ordem}>
                        <CheckCircleOutlined style={{ color: "#10B981" }} /> {item.descricao}
                      </Col>
                    ))}
                  </Row>
                </Card>
              ) : null}
              {escoposSelecionados.map((escopo) => (
                <Card key={escopo.id} title={`${escopo.nome} - checklist sugerido`}>
                  <Checkbox.Group
                    value={checklistSelecionado[escopo.id] || []}
                    onChange={(values) => setChecklistSelecionado((prev) => ({ ...prev, [escopo.id]: values }))}
                    style={{ display: "grid", gap: 8 }}
                    options={(checklists[escopo.id] || []).map((item) => ({
                      value: item.id,
                      label: `${item.descricao}${item.requer_foto ? " | foto" : ""}${item.requer_medicao ? ` | medição ${item.unidade_medicao}` : ""}`,
                    }))}
                  />
                  <Divider style={{ margin: "12px 0" }} />
                  <Text type="secondary">
                    Status disponíveis: {(escopoGerado?.status_checklist || []).map((statusItem) => statusItem.label).join(", ")}
                  </Text>
                  <Input style={{ marginTop: 12 }} placeholder="Adicionar item customizado ao checklist final (registrar no detalhe após salvar)" />
                </Card>
              ))}
            </Space>
          )}

          {step === 4 && (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Alert type="success" showIcon message="Resumo pronto para geração da proposta, rascunho ou ativação." />
              <Row gutter={16}>
                <Col xs={24} md={8}><Card><Text type="secondary">Escopos</Text><Title level={4}>{escoposSelecionados.length}</Title></Card></Col>
                <Col xs={24} md={8}><Card><Text type="secondary">Unidades</Text><Title level={4}>{unidades.length}</Title></Card></Col>
                <Col xs={24} md={8}><Card><Text type="secondary">Valor mensal</Text><Title level={4} style={{ color: "#10B981" }}>{money.format(totalMensal)}</Title></Card></Col>
              </Row>
              <Paragraph>Ao ativar, o ERP gera automaticamente as OS planejadas conforme periodicidade de cada escopo por unidade.</Paragraph>
              {escopoGerado?.observacao_tecnica_final && (
                <Alert type="info" showIcon message={escopoGerado.observacao_tecnica_final} />
              )}
              <Form.Item name="observacoes" label="Observações finais"><TextArea rows={3} /></Form.Item>
            </Space>
          )}
        </Form>

        <Divider />
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Button disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Voltar</Button>
          <Space>
            {step < 4 ? <Button type="primary" onClick={avancar}>Avançar</Button> : (
              <>
                <Button icon={<FilePdfOutlined />} loading={loading} onClick={() => salvar(false, true)}>Gerar PDF Proposta</Button>
                <Button icon={<SaveOutlined />} loading={loading} onClick={() => salvar(false, false)}>Salvar Rascunho</Button>
                <Button type="primary" loading={loading} onClick={() => salvar(true, true)}>Ativar Contrato</Button>
              </>
            )}
          </Space>
        </Space>
      </Card>
    </div>
  );
}
