import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Checkbox, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Space, Steps, Switch, Table, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, FilePdfOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../services/api";
import { money, normalizeList, pageStyle, periodicidadeOptions } from "./shared";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function EditarContrato() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [formValues, setFormValues] = useState({});
  const [clientes, setClientes] = useState([]);
  const [escopos, setEscopos] = useState([]);
  const [checklists, setChecklists] = useState({});
  const [escoposSelecionados, setEscoposSelecionados] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [checklistSelecionado, setChecklistSelecionado] = useState({});
  const [escopoGerado, setEscopoGerado] = useState(null);
  const [erroEscopos, setErroEscopos] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const autoSaveTimeoutRef = useRef(null);
  const [contrato, setContrato] = useState(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [clientesRes, escoposRes, contratoRes] = await Promise.all([
          api.get("/clientes/"),
          api.get("/contratos/escopos/"),
          api.get(`/contratos/${id}/`),
        ]);
        setClientes(normalizeList(clientesRes.data));
        const escoposCarregados = normalizeList(escoposRes.data);
        setEscopos(escoposCarregados);
        setErroEscopos(escoposCarregados.length ? "" : "Nenhum escopo técnico foi retornado pela API.");

        if (contratoRes.data.status !== "rascunho") {
          message.error("Apenas contratos em rascunho podem ser editados.");
          navigate(`/contratos/${id}`);
          return;
        }

        setContrato(contratoRes.data);
        carregarDadosContrato(contratoRes.data, escoposCarregados);
      } catch (error) {
        setErroEscopos("Não foi possível carregar os dados iniciais.");
        message.warning("Erro ao carregar contrato.");
      }
    }
    bootstrap();
  }, [id, navigate]);

  function carregarDadosContrato(contratoData, escoposCarregados) {
    const escoposDoContrato = contratoData.escopos_contrato?.map((ec) => {
      const escopoCompleto = escoposCarregados.find((e) => e.id === ec.escopo);
      return escopoCompleto || { id: ec.escopo, nome: ec.escopo_nome };
    }) || [];

    setEscoposSelecionados(escoposDoContrato);

    const unidadesCarregadas = contratoData.unidades?.map((u) => ({
      key: u.id,
      id: u.id,
      nome_unidade: u.nome_unidade,
      codigo_interno: u.codigo_interno || "",
      endereco_completo: u.endereco_completo,
      cep: u.cep || "",
      cidade: u.cidade || "",
      estado: u.estado || "",
      responsavel_local: u.responsavel_local || "",
      telefone_local: u.telefone_local || "",
      email_local: u.email_local || "",
      valor_mensal: u.valor_mensal || 0,
      observacoes: u.observacoes || "",
      escopos: u.escopos?.map((eu) => ({
        id: eu.id,
        escopo: eu.escopo,
        escopo_nome: eu.escopo_dados?.nome,
        periodicidade: eu.periodicidade,
        equipamentos_quantidade: eu.equipamentos_quantidade,
        equipamentos_descricao: eu.equipamentos_descricao,
        valor_alocado: eu.valor_alocado,
      })) || [],
    })) || [];

    setUnidades(unidadesCarregadas);

    const checklistMap = {};
    escoposDoContrato.forEach((escopo) => {
      const items = contratoData.unidades?.flatMap((u) =>
        u.escopos?.find((eu) => eu.escopo === escopo.id)?.checklist?.map((c) => c.item_padrao?.id) || []
      ) || [];
      checklistMap[escopo.id] = [...new Set(items)];
    });
    setChecklistSelecionado(checklistMap);

    const initialValues = {
      cliente: contratoData.cliente,
      titulo: contratoData.titulo,
      objeto_contrato: contratoData.objeto_contrato,
      vigencia_meses: contratoData.vigencia_meses,
      data_inicio: dayjs(contratoData.data_inicio),
      tipo_faturamento: contratoData.tipo_faturamento,
      dia_vencimento_fatura: contratoData.dia_vencimento_fatura,
      forma_pagamento: contratoData.forma_pagamento,
      reajuste_anual: contratoData.reajuste_anual,
      indice_reajuste: contratoData.indice_reajuste,
      renovacao_automatica: contratoData.renovacao_automatica,
      requer_art: contratoData.requer_art,
      responsavel_tecnico_crea: contratoData.responsavel_tecnico_crea,
      observacoes: contratoData.observacoes,
    };

    setFormValues(initialValues);
    form.setFieldsValue(initialValues);
  }

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

  async function autoSalvarRascunho() {
    const values = getValoresContrato();
    const temMinimoDados = values.cliente && values.titulo && values.objeto_contrato && unidades.length > 0;

    if (!temMinimoDados) return;

    setAutoSaveStatus("salvando");
    try {
      const contratoPayload = {
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

      await api.patch(`/contratos/${id}/`, contratoPayload);
      setAutoSaveStatus("salvo");
      setTimeout(() => setAutoSaveStatus(""), 2000);
    } catch (error) {
      console.error("[AUTOSAVE] Erro ao salvar rascunho:", error);
      setAutoSaveStatus("erro");
      setTimeout(() => setAutoSaveStatus(""), 3000);
    }
  }

  useEffect(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSalvarRascunho();
    }, 2000);
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [formValues, unidades, checklistSelecionado, escoposSelecionados]);

  async function carregarChecklist(escopoId) {
    if (checklists[escopoId]) return;
    try {
      const res = await api.get(`/contratos/escopos/${escopoId}/checklist-padrao/`);
      setChecklists((prev) => ({ ...prev, [escopoId]: res.data || [] }));
      setChecklistSelecionado((prev) => ({
        ...prev,
        [escopoId]: (res.data || []).map((item) => item.id),
      }));
    } catch {
      message.error("Erro ao carregar checklist.");
    }
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

  async function salvar(ativar = false, gerarPdf = false) {
    try {
      const values = getValoresContrato();
      console.log("[SAVE] Atualizando contrato com ativar=", ativar, "gerarPdf=", gerarPdf);

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

      setLoading(true);

      const contratoPayload = {
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

      if (ativar) {
        contratoPayload.status = "ativo";
      }

      const contratoRes = await api.post(`/contratos/${id}/salvar-completo/`, {
        contrato: contratoPayload,
        unidades: montarUnidadesPayload(),
        gerar_pdf: gerarPdf,
        ativar,
      });

      message.success(ativar ? "Contrato ativado e cronograma gerado." : "Contrato atualizado com sucesso.");
      setTimeout(() => navigate(`/contratos/${contratoRes.data?.id || id}`), 500);
    } catch (error) {
      console.error("[ERROR] Erro ao salvar contrato:", error);
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

  if (!contrato) {
    return <div style={pageStyle}>{loading ? "Carregando..." : "Contrato não encontrado"}</div>;
  }

  return (
    <div style={pageStyle}>
      <Space align="center" style={{ justifyContent: "space-between", width: "100%", marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Editar Contrato de Preventiva</Title>
          <Text type="secondary">Rascunho - Edite os dados e salve as alterações</Text>
          {autoSaveStatus === "salvando" && <Text type="warning" style={{ display: "block", marginTop: 8 }}>⏳ Salvando alterações...</Text>}
          {autoSaveStatus === "salvo" && <Text type="success" style={{ display: "block", marginTop: 8 }}>✓ Alterações salvas automaticamente</Text>}
          {autoSaveStatus === "erro" && <Text type="danger" style={{ display: "block", marginTop: 8 }}>✗ Erro ao salvar</Text>}
        </div>
        <Button onClick={() => navigate(`/contratos/${id}`)}>Voltar</Button>
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
              </Row>
            </>
          )}

          {step === 1 && (
            <Row gutter={[12, 12]}>
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
                    </Space>
                  )}
                </Card>
              </Col>
            </Row>
          )}

          {step === 2 && (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button type="primary" onClick={adicionarUnidade}>+ Adicionar unidade</Button>
              <Table
                rowKey="key"
                columns={unidadeColumns}
                dataSource={unidades}
                pagination={false}
                size="small"
              />
            </Space>
          )}

          {step === 3 && (
            <Space direction="vertical" style={{ width: "100%" }}>
              {!escoposSelecionados.length ? (
                <Alert type="info" showIcon message="Selecione escopos no passo anterior para configurar checklists." />
              ) : (
                escoposSelecionados.map((escopo) => (
                  <Card key={escopo.id} title={`Checklist - ${escopo.nome}`} size="small">
                    {checklists[escopo.id]?.length === 0 && <Text type="secondary">Nenhum item de checklist para este escopo.</Text>}
                    {(checklists[escopo.id] || []).map((item) => (
                      <Checkbox
                        key={item.id}
                        checked={(checklistSelecionado[escopo.id] || []).includes(item.id)}
                        onChange={(e) => {
                          setChecklistSelecionado((prev) => {
                            const selecionados = [...(prev[escopo.id] || [])];
                            if (e.target.checked) {
                              selecionados.push(item.id);
                            } else {
                              selecionados.splice(selecionados.indexOf(item.id), 1);
                            }
                            return { ...prev, [escopo.id]: selecionados };
                          });
                        }}
                      >
                        {item.descricao}
                      </Checkbox>
                    ))}
                  </Card>
                ))
              )}
            </Space>
          )}

          {step === 4 && (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Alert type="success" showIcon message="Resumo pronto para atualização ou ativação do contrato." />
              <Row gutter={16}>
                <Col xs={24} md={8}><Card><Text type="secondary">Escopos</Text><Title level={4}>{escoposSelecionados.length}</Title></Card></Col>
                <Col xs={24} md={8}><Card><Text type="secondary">Unidades</Text><Title level={4}>{unidades.length}</Title></Card></Col>
                <Col xs={24} md={8}><Card><Text type="secondary">Valor mensal</Text><Title level={4} style={{ color: "#10B981" }}>{money.format(totalMensal)}</Title></Card></Col>
              </Row>
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
                <Button icon={<SaveOutlined />} loading={loading} onClick={() => salvar(false, false)}>Atualizar rascunho</Button>
                <Button type="primary" loading={loading} onClick={() => salvar(true, true)}>Ativar Contrato</Button>
              </>
            )}
          </Space>
        </Space>
      </Card>
    </div>
  );
}
