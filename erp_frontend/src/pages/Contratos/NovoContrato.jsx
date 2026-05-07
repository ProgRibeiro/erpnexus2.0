import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Checkbox, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Space, Steps, Switch, Table, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, FilePdfOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { money, normalizeList, pageStyle, periodicidadeOptions } from "./shared";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function NovoContrato() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [clientes, setClientes] = useState([]);
  const [escopos, setEscopos] = useState([]);
  const [checklists, setChecklists] = useState({});
  const [escoposSelecionados, setEscoposSelecionados] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [checklistSelecionado, setChecklistSelecionado] = useState({});
  const [escopoGerado, setEscopoGerado] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [clientesRes, escoposRes] = await Promise.all([
          api.get("/clientes/"),
          api.get("/contratos/escopos/"),
        ]);
        setClientes(normalizeList(clientesRes.data));
        setEscopos(normalizeList(escoposRes.data));
      } catch {
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

  async function salvar(ativar = false, gerarPdf = false) {
    try {
      const values = await form.validateFields();
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
      const payload = {
        cliente: values.cliente,
        titulo: values.titulo,
        objeto_contrato: values.objeto_contrato,
        vigencia_meses: values.vigencia_meses,
        data_inicio: values.data_inicio.format("YYYY-MM-DD"),
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
      const contratoRes = await api.post("/contratos/", payload);
      const contrato = contratoRes.data;

      for (const unidade of unidades) {
        const unidadeRes = await api.post(`/contratos/${contrato.id}/unidades/`, {
          nome_unidade: unidade.nome_unidade,
          codigo_interno: unidade.codigo_interno || "",
          endereco_completo: unidade.endereco_completo,
          cidade: unidade.cidade || "",
          estado: unidade.estado || "",
          responsavel_local: unidade.responsavel_local || "",
          telefone_local: unidade.telefone_local || "",
          email_local: unidade.email_local || "",
          valor_mensal: unidade.valor_mensal || 0,
          observacoes: unidade.observacoes || "",
        });
        await api.post(`/contratos/${contrato.id}/escopos-unidade/`, {
          unidade_contrato: unidadeRes.data.id,
          escopos: unidade.escopos.map((escopo) => ({
            ...escopo,
            checklist_ids: checklistSelecionado[escopo.escopo] || [],
          })),
        });
      }

      await api.post(`/contratos/${contrato.id}/calcular-totais/`);
      if (gerarPdf) await api.post(`/contratos/${contrato.id}/gerar-pdf-proposta/`);
      if (ativar) await api.post(`/contratos/${contrato.id}/ativar/`);
      message.success(ativar ? "Contrato ativado e cronograma gerado." : "Contrato salvo como rascunho.");
      navigate(`/contratos/${contrato.id}`);
    } catch (error) {
      const data = error?.response?.data;
      message.error(data ? JSON.stringify(data) : "Erro ao salvar contrato.");
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
        <Form form={form} layout="vertical" initialValues={{
          vigencia_meses: 12,
          data_inicio: dayjs(),
          tipo_faturamento: "mensal_fixo",
          dia_vencimento_fatura: 10,
          forma_pagamento: "boleto",
          reajuste_anual: true,
          indice_reajuste: "IPCA",
        }}>
          {step === 0 && (
            <>
              <Row gutter={16}>
                <Col xs={24} md={12}><Form.Item name="cliente" label="Cliente" rules={[{ required: true }]}><Select showSearch optionFilterProp="children">{clientes.map((c) => <Select.Option key={c.id} value={c.id}>{c.nome}</Select.Option>)}</Select></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="titulo" label="Título" rules={[{ required: true }]}><Input placeholder="Contrato de Manutenção Preventiva 2026" /></Form.Item></Col>
                <Col xs={24}><Form.Item name="objeto_contrato" label="Objeto do contrato" rules={[{ required: true }]}><TextArea rows={4} placeholder="Descreva o que será feito em todas as unidades..." /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="vigencia_meses" label="Vigência"><Select options={[12, 24, 36].map((v) => ({ value: v, label: `${v} meses` }))} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="data_inicio" label="Início"><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
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
                  {unidade.escopos.map((escopo, escopoIndex) => (
                    <Row gutter={12} key={escopo.escopo} align="middle" style={{ marginBottom: 8 }}>
                      <Col xs={24} md={5}><Text strong>{escopo.escopo_nome}</Text></Col>
                      <Col xs={24} md={5}><Select value={escopo.periodicidade} onChange={(v) => atualizarEscopoUnidade(unidadeIndex, escopoIndex, "periodicidade", v)} options={periodicidadeOptions} style={{ width: "100%" }} /></Col>
                      <Col xs={24} md={4}><InputNumber min={1} value={escopo.equipamentos_quantidade} onChange={(v) => atualizarEscopoUnidade(unidadeIndex, escopoIndex, "equipamentos_quantidade", v || 1)} style={{ width: "100%" }} /></Col>
                      <Col xs={24} md={6}><Input value={escopo.equipamentos_descricao} onChange={(e) => atualizarEscopoUnidade(unidadeIndex, escopoIndex, "equipamentos_descricao", e.target.value)} placeholder="Equipamentos" /></Col>
                      <Col xs={24} md={4}><InputNumber min={0} precision={2} value={escopo.valor_alocado} onChange={(v) => atualizarEscopoUnidade(unidadeIndex, escopoIndex, "valor_alocado", v || 0)} prefix="R$" style={{ width: "100%" }} /></Col>
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
            {step < 4 ? <Button type="primary" onClick={() => setStep((s) => s + 1)}>Avançar</Button> : (
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
