import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  SaveOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import api from "../../services/api";
import clienteService from "../../services/clienteService";

const { Text, Title } = Typography;
const { TextArea } = Input;

const colors = {
  azul: "#3B82F6",
  roxo: "#5B21B6",
  verde: "#1A7A4A",
  laranja: "#B45309",
  vermelho: "#B91C1C",
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  fundoSuave: "#F8FAFD",
};

const pageStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const panelStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const primaryButtonStyle = {
  height: 40,
  borderRadius: 10,
  fontWeight: 600,
  paddingInline: 20,
};

const serviceOptions = [
  { value: "refrigeracao", label: "Refrigeração / Ar condicionado" },
  { value: "eletrica", label: "Elétrica" },
  { value: "civil", label: "Civil" },
  { value: "manutencao", label: "Manutenção preventiva" },
  { value: "instalacao", label: "Instalação" },
  { value: "hvac", label: "HVAC" },
  { value: "outro", label: "Outro / Corretiva geral" },
];

const prioridadeOptions = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Normal" },
  { value: "alta", label: "Urgente" },
  { value: "urgente", label: "Emergência" },
];

const origemOptions = [
  { value: "telefone", label: "Telefone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
];

const statusOptions = [
  { value: "aberta", label: "Aberta / lead aprovado direto" },
  { value: "aprovada", label: "Aprovada" },
  { value: "agendada", label: "Agendada" },
  { value: "em_execucao", label: "Em execução" },
];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export default function NovaOS() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [clientes, setClientes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [criarClienteRapido, setCriarClienteRapido] = useState(false);

  const status = Form.useWatch("status", form);
  const valorServico = Form.useWatch("valor_servico", form);

  const valorPrevisto = useMemo(() => Number(valorServico || 0), [valorServico]);

  useEffect(() => {
    const carregar = async () => {
      try {
        setLoading(true);
        const [clientesData, usuariosRes] = await Promise.all([
          clienteService.listar(),
          api.get("/auth/users/"),
        ]);
        setClientes(normalizeList(clientesData));
        setTecnicos(
          normalizeList(usuariosRes.data)
            .filter((usuario) => String(usuario.role || "").toLowerCase() === "tecnico")
            .map((usuario) => ({
              value: usuario.id,
              label: usuario.nome_completo || usuario.username || usuario.email,
            }))
        );
      } catch {
        message.error("Não foi possível carregar clientes e técnicos.");
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  useEffect(() => {
    form.setFieldsValue({
      status: "aberta",
      tipo_servico: "refrigeracao",
      prioridade: "media",
      origem_lead: "telefone",
      data_agendada: dayjs(),
      valor_servico: 0,
      condicao_pagamento: "A combinar",
      tipo_relatorio: "tecnico",
    });
  }, [form]);

  const criarClienteSeNecessario = async (values) => {
    if (!criarClienteRapido) return values.cliente;

    const cliente = await clienteService.criar({
      nome: values.cliente_nome,
      cnpj_cpf: values.cliente_documento || "",
      email: values.cliente_email || "",
      telefone: values.cliente_telefone || "",
      whatsapp: values.cliente_whatsapp || values.cliente_telefone || "",
      segmento: values.cliente_segmento || "servicos",
      origem: values.origem_lead || "telefone",
      status: "ativo",
      observacoes: "Cliente criado rapidamente pela tela Nova OS.",
    });
    return cliente.id;
  };

  const criarOS = async (values) => {
    setSaving(true);
    try {
      const clienteId = await criarClienteSeNecessario(values);
      const valor = Number(values.valor_servico || 0);
      const payload = {
        cliente: clienteId,
        status: values.status,
        tipo_servico: values.tipo_servico,
        prioridade: values.prioridade,
        origem_lead: values.origem_lead,
        descricao_servico: values.descricao_servico,
        condicao_pagamento: values.condicao_pagamento || "",
        tecnico_responsavel: values.tecnico_responsavel || null,
        data_agendada: values.data_agendada?.format("YYYY-MM-DD") || null,
        hora_inicio: values.hora_inicio?.format("HH:mm:ss") || null,
        equipamento_marca: values.equipamento_marca || "",
        equipamento_modelo: values.equipamento_modelo || "",
        equipamento_serie: values.equipamento_serie || "",
        observacoes_tecnicas: values.observacoes_tecnicas || "",
        tipo_relatorio: values.tipo_relatorio || "tecnico",
        valor_final_faturado: valor,
        itens: valor > 0 ? [
          {
            origem_tipo: "avulso",
            descricao: values.descricao_servico || "Serviço aprovado sem orçamento",
            quantidade: 1,
            valor_unitario: valor,
            ordem: 1,
          },
        ] : [],
      };

      const response = await api.post("/ordens/", payload);
      message.success("OS criada com sucesso.");
      navigate(`/ordens/${response.data.id}?tab=execucao`);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      message.error(detail || "Não foi possível criar a OS.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={pageStyle}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16 }}>
          <div>
            <Text style={{ color: colors.textoFraco, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Ordem sem orçamento
            </Text>
            <Title level={1} style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: colors.texto }}>
              Nova Ordem de Serviço
            </Title>
          </div>
          <Space>
            <Button onClick={() => navigate("/ordens")} style={{ borderRadius: 8, height: 40 }}>
              Cancelar
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => form.submit()}
              style={primaryButtonStyle}
            >
              Criar OS
            </Button>
          </Space>
        </div>
      </Card>

      <Alert
        type="info"
        showIcon
        message="Use esta tela quando o serviço já foi aprovado sem passar por orçamento."
        description="Depois de criar a OS, você pode preencher o relatório técnico, anexar fotos antes/depois e gerar o relatório fotográfico."
        style={{ borderRadius: 12 }}
      />

      <Form form={form} layout="vertical" onFinish={criarOS} disabled={loading}>
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={16}>
            <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
              <Title level={4} style={{ marginTop: 0, color: colors.texto }}>Dados da OS</Title>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Cliente"
                    name="cliente"
                    rules={!criarClienteRapido ? [{ required: true, message: "Selecione o cliente" }] : []}
                  >
                    <Select
                      showSearch
                      allowClear
                      disabled={criarClienteRapido}
                      optionFilterProp="label"
                      placeholder="Selecione um cliente existente"
                      options={clientes.map((cliente) => ({
                        value: cliente.id,
                        label: cliente.nome || cliente.nome_fantasia || cliente.razao_social,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Criar cliente rápido">
                    <Switch
                      checked={criarClienteRapido}
                      checkedChildren="Sim"
                      unCheckedChildren="Não"
                      onChange={setCriarClienteRapido}
                    />
                  </Form.Item>
                </Col>
                {criarClienteRapido && (
                  <>
                    <Col xs={24} md={12}>
                      <Form.Item label="Nome do cliente" name="cliente_nome" rules={[{ required: true, message: "Informe o cliente" }]}>
                        <Input placeholder="Nome fantasia ou razão social" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="CNPJ/CPF" name="cliente_documento">
                        <Input placeholder="Opcional" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Telefone" name="cliente_telefone">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="WhatsApp" name="cliente_whatsapp">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Email" name="cliente_email">
                        <Input />
                      </Form.Item>
                    </Col>
                  </>
                )}
                <Col xs={24} md={8}>
                  <Form.Item label="Tipo de serviço" name="tipo_servico" rules={[{ required: true }]}>
                    <Select options={serviceOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Prioridade" name="prioridade" rules={[{ required: true }]}>
                    <Select options={prioridadeOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Origem" name="origem_lead">
                    <Select options={origemOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Descrição do serviço aprovado" name="descricao_servico" rules={[{ required: true, message: "Descreva o serviço" }]}>
                    <TextArea rows={4} placeholder="Ex: Manutenção corretiva em condensadora com troca de capacitor e teste de funcionamento." />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
              <Title level={4} style={{ marginTop: 0, color: colors.texto }}>Execução</Title>
              <Form.Item label="Status inicial" name="status">
                <Select options={statusOptions} />
              </Form.Item>
              <Form.Item label="Técnico responsável" name="tecnico_responsavel">
                <Select allowClear options={tecnicos} placeholder="Sem técnico ainda" />
              </Form.Item>
              <Form.Item label="Data agendada" name="data_agendada">
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} suffixIcon={<CalendarOutlined />} />
              </Form.Item>
              <Form.Item label="Hora de início" name="hora_inicio">
                <DatePicker picker="time" format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
              <Divider style={{ borderColor: colors.borda }} />
              <Form.Item label="Valor aprovado" name="valor_servico">
                <InputNumber prefix="R$" min={0} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="Condição de pagamento" name="condicao_pagamento">
                <Input placeholder="Pix, boleto, 30 dias..." />
              </Form.Item>
              <Alert
                type={status === "agendada" || status === "em_execucao" ? "success" : "info"}
                showIcon
                icon={<CheckCircleOutlined />}
                message={`Valor previsto: ${valorPrevisto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
                style={{ borderRadius: 10 }}
              />
            </Card>
          </Col>

          <Col xs={24}>
            <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
              <Title level={4} style={{ marginTop: 0, color: colors.texto }}>
                <ToolOutlined style={{ marginRight: 8, color: colors.azul }} />
                Relatório técnico inicial
              </Title>
              <Row gutter={16}>
                <Col xs={24} md={6}>
                  <Form.Item label="Tipo de relatório" name="tipo_relatorio">
                    <Select
                      options={[
                        { value: "simples", label: "Corretivo" },
                        { value: "tecnico", label: "Preventivo" },
                        { value: "fotografico", label: "Fotográfico / visita" },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item label="Marca" name="equipamento_marca">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item label="Modelo" name="equipamento_modelo">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item label="Série / patrimônio" name="equipamento_serie">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Observações técnicas iniciais" name="observacoes_tecnicas">
                    <TextArea rows={3} placeholder="Condições encontradas, orientação inicial ao técnico, acesso, restrições ou observações do cliente." />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
