import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Switch,
  Table,
  Tabs,
  message,
  Select,
  InputNumber,
  Badge,
  Alert,
  Divider,
  Row,
  Col,
  Tooltip,
  Spin,
  Modal,
  Upload,
  ColorPicker,
  Drawer,
  Space,
} from "antd";
import {
  InfoCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import configuracoesService from "../../services/configuracoes";
import usuariosService from "../../services/usuariosService";
import ExcelImportModal from "../../components/ExcelImportModal";

const btnStyle = {
  background: "#3B82F6",
  borderColor: "#3B82F6",
  color: "#ffffff",
  fontWeight: 500,
  height: "38px",
  borderRadius: "8px",
};

const maskCNPJ = (value) => {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .substring(0, 18);
};

const unmaskCNPJ = (value) => {
  return value.replace(/\D/g, "");
};

export default function ConfiguracoesPage() {
  const [empresaForm] = Form.useForm();
  const [fiscalForm] = Form.useForm();
  const [osForm] = Form.useForm();
  const [financeiraForm] = Form.useForm();
  const [usuarioForm] = Form.useForm();

  // Estados
  const [notificacoes, setNotificacoes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [corPrincipal, setCorPrincipal] = useState("#1677ff");
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [cnpjStatus, setCnpjStatus] = useState(null);
  const [cnpjData, setCnpjData] = useState(null);
  const [regime, setRegime] = useState(null);
  const [loadingImpostos, setLoadingImpostos] = useState(false);
  const [impostoPreview, setImpostoPreview] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [drawerUsuarioOpen, setDrawerUsuarioOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFileList, setLogoFileList] = useState([]);

  // Carregamento inicial
  useEffect(() => {
    carregarConfiguradores();
  }, []);

  const carregarConfiguradores = async () => {
    try {
      // Empresa
      const empresa = await configuracoesService.obterEmpresa();
      empresaForm.setFieldsValue(empresa);
      setCorPrincipal(empresa.cor_principal || "#1677ff");
      setLogoPreview(empresa.logo);
      setLogoFileList([]);

      // Notificações
      const notif = await configuracoesService.listarNotificacoes();
      setNotificacoes(notif);

      // OS
      const os = await configuracoesService.obterConfiguracoes?.();
      if (os) osForm.setFieldsValue(os);

      // Financeira
      const financeira = await configuracoesService.obterConfiguracaoFinanceira();
      financeiraForm.setFieldsValue(financeira);

      // Config Fiscal
      const fiscal = await configuracoesService.obterConfigFiscal?.();
      if (fiscal) {
        fiscalForm.setFieldsValue(fiscal);
        setRegime(fiscal.regime_tributario);
      }

      // Usuários
      carregarUsuarios();
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const carregarUsuarios = async () => {
    setLoadingUsuarios(true);
    try {
      const data = await usuariosService.listar();
      setUsuarios(data);
    } catch (error) {
      message.error("Erro ao carregar usuários");
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Empresa
  const salvarEmpresa = async (values) => {
    try {
      const payload = {
        ...values,
        logo: logoFileList[0]?.originFileObj,
      };

      const empresaAtualizada = await configuracoesService.salvarEmpresa(payload);
      message.success("Empresa salva");
      setCorPrincipal(values.cor_principal);
      setLogoPreview(empresaAtualizada?.logo || logoPreview);
      setLogoFileList([]);
      document.documentElement.style.setProperty(
        "--primary-color",
        values.cor_principal
      );
    } catch (error) {
      const detail =
        error?.response?.data?.logo?.[0] ||
        error?.response?.data?.detail ||
        error?.message;
      message.error(detail ? `Erro ao salvar empresa: ${detail}` : "Erro ao salvar empresa");
    }
  };

  // Notificações
  const salvarNotificacoes = async () => {
    try {
      await configuracoesService.salvarNotificacoes(notificacoes);
      message.success("Notificações salvas");
    } catch (error) {
      message.error("Erro ao salvar notificações");
    }
  };

  // OS
  const salvarOS = async (values) => {
    try {
      await configuracoesService.salvarConfiguracaoOS(values);
      message.success("Configuração de OS salva");
    } catch (error) {
      message.error("Erro ao salvar configuração de OS");
    }
  };

  // Financeira
  const salvarFinanceira = async (values) => {
    try {
      await configuracoesService.salvarConfiguracaoFinanceira(values);
      message.success("Configuração financeira salva");
    } catch (error) {
      message.error("Erro ao salvar configuração financeira");
    }
  };

  // CNPJ
  const consultarCNPJ = async () => {
    const cnpj = fiscalForm.getFieldValue("cnpj_consulta");
    if (!cnpj) {
      message.warning("Digite um CNPJ");
      return;
    }

    const cnpjLimpo = unmaskCNPJ(cnpj);
    if (cnpjLimpo.length !== 14) {
      message.error("CNPJ inválido");
      return;
    }

    setLoadingCNPJ(true);
    try {
      const data =
        (await configuracoesService.consultarCNPJ?.(cnpjLimpo)) || {
          razao_social: "Empresa Fictícia",
          municipio: "São Paulo",
          uf: "SP",
          regime: "Simples Nacional",
        };

      setCnpjData(data);
      setCnpjStatus("success");
      fiscalForm.setFieldsValue({
        razao_social: data.razao_social,
        municipio: data.municipio,
        uf: data.uf,
      });
      message.success("CNPJ consultado com sucesso");
    } catch (error) {
      setCnpjStatus("error");
      setCnpjData(null);
      message.error("CNPJ não encontrado");
    } finally {
      setLoadingCNPJ(false);
    }
  };

  // Impostos
  const calcularImpostos = async () => {
    const valorServicos = fiscalForm.getFieldValue("valor_servicos") || 0;
    const valorMateriais = fiscalForm.getFieldValue("valor_materiais") || 0;

    if (valorServicos === 0 && valorMateriais === 0) {
      message.warning("Digite valores para calcular");
      return;
    }

    setLoadingImpostos(true);
    try {
      const resultado =
        (await configuracoesService.calcularImpostos?.({
          valor_servicos: valorServicos,
          valor_materiais: valorMateriais,
          regime: regime || "simples_nacional",
        })) || {
          subtotal_servicos: valorServicos,
          subtotal_materiais: valorMateriais,
          iss: valorServicos * 0.05,
          pis: (valorServicos + valorMateriais) * 0.0065,
          cofins: (valorServicos + valorMateriais) * 0.03,
          irpj: (valorServicos + valorMateriais) * 0.048,
          csll: (valorServicos + valorMateriais) * 0.0288,
        };

      const totalImpostos =
        resultado.iss +
        resultado.pis +
        resultado.cofins +
        resultado.irpj +
        resultado.csll;
      setImpostoPreview({
        ...resultado,
        total_impostos: totalImpostos,
        total_geral:
          resultado.subtotal_servicos +
          resultado.subtotal_materiais +
          totalImpostos,
      });

      message.success("Impostos calculados");
    } catch (error) {
      message.error("Erro ao calcular impostos");
    } finally {
      setLoadingImpostos(false);
    }
  };

  const salvarConfigFiscal = async () => {
    try {
      const values = fiscalForm.getFieldsValue();
      await configuracoesService.salvarConfigFiscal?.(values);
      message.success("Configuração fiscal salva");
    } catch (error) {
      message.error("Erro ao salvar configuração fiscal");
    }
  };

  // Usuários
  const handleNovoUsuario = () => {
    setUsuarioEditando(null);
    usuarioForm.resetFields();
    setDrawerUsuarioOpen(true);
  };

  const handleEditarUsuario = (usuario) => {
    setUsuarioEditando(usuario);
    usuarioForm.setFieldsValue({
      first_name: usuario.first_name,
      last_name: usuario.last_name,
      email: usuario.email,
      role: usuario.role,
      cargo: usuario.cargo,
      departamento: usuario.departamento,
      telefone: usuario.telefone,
    });
    setDrawerUsuarioOpen(true);
  };

  const handleSalvarUsuario = async (values) => {
    try {
      if (usuarioEditando) {
        // Atualizar
        await usuariosService.atualizar(usuarioEditando.id, values);
        message.success("Usuário atualizado");
      } else {
        // Criar
        const resultado = await usuariosService.criar(values);
        Modal.info({
          title: "Usuário criado com sucesso",
          content: (
            <div>
              <p>Novo usuário criado: {resultado.usuario.email}</p>
              <p>
                <strong>Senha temporária:</strong> {resultado.senha_temporaria}
              </p>
              <p style={{ color: "#d32f2f" }}>
                *Guarde a senha temporária e compartilhe com o usuário
              </p>
            </div>
          ),
        });
      }
      setDrawerUsuarioOpen(false);
      carregarUsuarios();
    } catch (error) {
      message.error("Erro ao salvar usuário");
    }
  };

  const handleDesativarUsuario = (usuario) => {
    Modal.confirm({
      title: "Desativar usuário?",
      content: `Tem certeza que deseja desativar ${usuario.first_name}?`,
      okText: "Desativar",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await usuariosService.desativar(usuario.id);
          message.success("Usuário desativado");
          carregarUsuarios();
        } catch (error) {
          message.error("Erro ao desativar usuário");
        }
      },
    });
  };

  const handleResetarSenha = (usuario) => {
    Modal.confirm({
      title: "Resetar senha?",
      content: `Tem certeza que deseja resetar a senha de ${usuario.first_name}?`,
      okText: "Resetar",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          const resultado = await usuariosService.resetarSenha(usuario.id);
          Modal.info({
            title: "Senha resetada",
            content: (
              <div>
                <p>Nova senha temporária:</p>
                <p style={{ fontSize: 16, fontWeight: "bold" }}>
                  {resultado.nova_senha_temporaria}
                </p>
                <p style={{ color: "#d32f2f" }}>
                  *Compartilhe esta senha com o usuário
                </p>
              </div>
            ),
          });
          carregarUsuarios();
        } catch (error) {
          message.error("Erro ao resetar senha");
        }
      },
    });
  };

  const usuariosColumns = [
    {
      title: "Nome",
      dataIndex: "nome_completo",
      key: "nome_completo",
      sorter: (a, b) => a.nome_completo.localeCompare(b.nome_completo),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Cargo",
      dataIndex: "cargo",
      key: "cargo",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Badge
          status={
            role === "admin"
              ? "success"
              : role === "gestor"
              ? "processing"
              : "default"
          }
          text={role}
        />
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Badge
          status={status === "ativo" ? "success" : "error"}
          text={status}
        />
      ),
    },
    {
      title: "Ações",
      key: "acoes",
      render: (_, usuario) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditarUsuario(usuario)}
          />
          <Button
            type="text"
            danger
            icon={<KeyOutlined />}
            onClick={() => handleResetarSenha(usuario)}
            title="Resetar senha"
          />
          {usuario.status === "ativo" && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDesativarUsuario(usuario)}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Tabs
        items={[
          // ABA: EMPRESA
          {
            key: "empresa",
            label: "Empresa",
            children: (
              <Form form={empresaForm} layout="vertical" onFinish={salvarEmpresa}>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="nome" label="Nome da empresa">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="razao_social" label="Razão social">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="cnpj" label="CNPJ">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="telefone" label="Telefone">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="email" label="Email">
                      <Input type="email" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="site" label="Site">
                      <Input type="url" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="endereco" label="Endereço">
                  <Input.TextArea rows={3} />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="logo" label="Logo">
                      <Upload
                        maxCount={1}
                        accept="image/*"
                        beforeUpload={() => false}
                        fileList={logoFileList}
                        onChange={({ fileList }) => {
                          const normalized = fileList.slice(-1);
                          setLogoFileList(normalized);
                          const currentFile = normalized[0]?.originFileObj;
                          if (currentFile) {
                            const objectUrl = URL.createObjectURL(currentFile);
                            setLogoPreview(objectUrl);
                          }
                        }}
                        onRemove={() => {
                          setLogoFileList([]);
                          setLogoPreview(null);
                        }}
                      >
                        <Button icon={<UploadOutlined />}>
                          Fazer upload da logo
                        </Button>
                      </Upload>
                      {logoPreview && (
                        <img
                          src={logoPreview}
                          alt="Preview da logo"
                          style={{
                            maxWidth: "140px",
                            maxHeight: "80px",
                            marginTop: 12,
                            borderRadius: 12,
                            border: "1px solid #E2E6EC",
                            padding: 8,
                            background: "#FFFFFF",
                          }}
                        />
                      )}
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="cor_principal" label="Cor principal">
                      <Input
                        type="color"
                        style={{ height: "40px", width: "100%" }}
                        onChange={(e) => {
                          setCorPrincipal(e.target.value);
                          empresaForm.setFieldValue(
                            "cor_principal",
                            e.target.value
                          );
                        }}
                      />
                    </Form.Item>
                    <div
                      style={{
                        marginTop: 8,
                        padding: "10px 15px",
                        borderRadius: 4,
                        backgroundColor: corPrincipal,
                        color: "white",
                        textAlign: "center",
                      }}
                    >
                      Preview: {corPrincipal}
                    </div>
                  </Col>
                </Row>

                <Button htmlType="submit" style={btnStyle}>
                  Salvar Empresa
                </Button>
              </Form>
            ),
          },

          // ABA: NOTIFICAÇÕES
          {
            key: "notificacoes",
            label: "Notificações",
            children: (
              <>
                <Table
                  rowKey="tipo"
                  dataSource={notificacoes}
                  columns={[
                    { title: "Tipo", dataIndex: "tipo" },
                    {
                      title: "Ativo",
                      dataIndex: "ativo",
                      render: (value, record, index) => (
                        <Switch
                          checked={value}
                          onChange={(checked) => {
                            const next = [...notificacoes];
                            next[index] = { ...record, ativo: checked };
                            setNotificacoes(next);
                          }}
                        />
                      ),
                    },
                    {
                      title: "Email destino",
                      dataIndex: "email_destino",
                      render: (value, record, index) => (
                        <Input
                          value={value}
                          onChange={(event) => {
                            const next = [...notificacoes];
                            next[index] = {
                              ...record,
                              email_destino: event.target.value,
                            };
                            setNotificacoes(next);
                          }}
                        />
                      ),
                    },
                  ]}
                />
                <Button
                  onClick={salvarNotificacoes}
                  style={{ ...btnStyle, marginTop: 16 }}
                >
                  Salvar Notificações
                </Button>
              </>
            ),
          },

          // ABA: ORDENS DE SERVIÇO
          {
            key: "os",
            label: "Ordens de Serviço",
            children: (
              <Form form={osForm} layout="vertical" onFinish={salvarOS}>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="prefixo" label="Prefixo de numeração">
                      <Input placeholder="Ex: OS" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="proximo_numero"
                      label="Próximo número"
                      tooltip="Será incrementado automaticamente"
                    >
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="validade_padrao"
                      label="Validade padrão (dias)"
                    >
                      <InputNumber style={{ width: "100%" }} min={1} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="incluir_logo_pdf" label="Incluir logo no PDF">
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="incluir_assinatura_pdf"
                  label="Incluir campo de assinatura no PDF"
                >
                  <Switch />
                </Form.Item>

                <Form.Item name="texto_termos" label="Texto de termos padrão">
                  <Input.TextArea
                    rows={4}
                    placeholder="Texto que aparecerá em todas as novas OS"
                  />
                </Form.Item>

                <Form.Item
                  name="texto_condicoes"
                  label="Condições de pagamento padrão"
                >
                  <Input.TextArea rows={4} />
                </Form.Item>

                <Button htmlType="submit" style={btnStyle}>
                  Salvar Configuração OS
                </Button>
              </Form>
            ),
          },

          // ABA: FINANCEIRA
          {
            key: "financeira",
            label: "Financeira",
            children: (
              <Form form={financeiraForm} layout="vertical" onFinish={salvarFinanceira}>
                <Divider>ISS</Divider>
                <Form.Item
                  name="aliquota_iss"
                  label={
                    <span>
                      Alíquota ISS (%)
                      <Tooltip title="Padrão 5%, consulte seu município">
                        <InfoCircleOutlined style={{ marginLeft: 8 }} />
                      </Tooltip>
                    </span>
                  }
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    step={0.01}
                    min={0}
                    max={100}
                  />
                </Form.Item>

                <Divider>Contas Padrão</Divider>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="conta_padrao_receber" label="Conta padrão receber">
                      <Input placeholder="Ex: 0001-1" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="conta_padrao_pagar" label="Conta padrão pagar">
                      <Input placeholder="Ex: 0002-1" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={8}>
                    <Form.Item name="banco_padrao" label="Banco padrão">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item name="agencia_padrao" label="Agência padrão">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item name="conta_corrente_padrao" label="Conta corrente">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider>Prazos e Multas</Divider>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="dias_padrao_pagamento"
                      label="Dias padrão para pagamento"
                    >
                      <InputNumber style={{ width: "100%" }} min={1} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="dias_padrao_recebimento"
                      label="Dias padrão para recebimento"
                    >
                      <InputNumber style={{ width: "100%" }} min={1} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="juros_atraso" label="Juros mensais atraso (%)">
                      <InputNumber
                        style={{ width: "100%" }}
                        step={0.01}
                        min={0}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="multa_atraso" label="Multa por atraso (%)">
                      <InputNumber
                        style={{ width: "100%" }}
                        step={0.01}
                        min={0}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Button htmlType="submit" style={btnStyle}>
                  Salvar Configuração Financeira
                </Button>
              </Form>
            ),
          },

          // ABA: USUÁRIOS
          {
            key: "usuarios",
            label: "Usuários",
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleNovoUsuario}
                    style={btnStyle}
                  >
                    Novo usuário
                  </Button>
                </div>

                <Table
                  loading={loadingUsuarios}
                  columns={usuariosColumns}
                  dataSource={usuarios}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />

                <Drawer
                  title={
                    usuarioEditando
                      ? "Editar usuário"
                      : "Novo usuário"
                  }
                  onClose={() => setDrawerUsuarioOpen(false)}
                  open={drawerUsuarioOpen}
                  width={500}
                >
                  <Form
                    form={usuarioForm}
                    layout="vertical"
                    onFinish={handleSalvarUsuario}
                  >
                    <Form.Item
                      name="first_name"
                      label="Primeiro nome"
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>

                    <Form.Item name="last_name" label="Último nome">
                      <Input />
                    </Form.Item>

                    <Form.Item
                      name="email"
                      label="Email"
                      rules={[{ required: true, type: "email" }]}
                    >
                      <Input disabled={!!usuarioEditando} />
                    </Form.Item>

                    {!usuarioEditando && (
                      <Alert
                        message="Uma senha temporária será gerada automaticamente"
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    )}

                    <Form.Item name="role" label="Função">
                      <Select
                        options={[
                          { value: "admin", label: "Administrador" },
                          { value: "gestor", label: "Gestor" },
                          { value: "financeiro", label: "Financeiro" },
                          { value: "comercial", label: "Comercial" },
                          { value: "tecnico", label: "Técnico" },
                          { value: "estoquista", label: "Estoquista" },
                          { value: "suporte", label: "Suporte" },
                        ]}
                      />
                    </Form.Item>

                    <Form.Item name="cargo" label="Cargo">
                      <Input />
                    </Form.Item>

                    <Form.Item name="departamento" label="Departamento">
                      <Input />
                    </Form.Item>

                    <Form.Item name="telefone" label="Telefone">
                      <Input />
                    </Form.Item>

                    <Space style={{ width: "100%" }}>
                      <Button htmlType="submit" style={btnStyle}>
                        Salvar
                      </Button>
                      <Button onClick={() => setDrawerUsuarioOpen(false)}>
                        Cancelar
                      </Button>
                    </Space>
                  </Form>
                </Drawer>
              </>
            ),
          },

          // ABA: FISCAL
          {
            key: "fiscal",
            label: "Fiscal",
            children: (
              <Spin spinning={loadingImpostos}>
                <Form form={fiscalForm} layout="vertical">
                  {/* SEÇÃO: Consulta automática por CNPJ */}
                  <Divider>Consulta automática por CNPJ</Divider>
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={16}>
                      <Form.Item name="cnpj_consulta" label="CNPJ">
                        <Input
                          placeholder="XX.XXX.XXX/XXXX-XX"
                          value={fiscalForm.getFieldValue("cnpj_consulta")}
                          onChange={(e) => {
                            const masked = maskCNPJ(e.target.value);
                            fiscalForm.setFieldValue("cnpj_consulta", masked);
                          }}
                          maxLength={18}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label=" ">
                        <Button
                          loading={loadingCNPJ}
                          onClick={consultarCNPJ}
                          style={btnStyle}
                          block
                        >
                          Consultar CNPJ
                        </Button>
                      </Form.Item>
                    </Col>
                  </Row>

                  {cnpjStatus === "success" && cnpjData && (
                    <Alert
                      message={
                        <>
                          <Badge status="success" text="CNPJ válido" />
                          {" - Regime: " + (cnpjData.regime || "Não identificado")}
                        </>
                      }
                      type="success"
                      style={{ marginBottom: 16 }}
                      showIcon
                    />
                  )}

                  {cnpjStatus === "error" && (
                    <Alert
                      message={<Badge status="error" text="CNPJ não encontrado" />}
                      type="error"
                      style={{ marginBottom: 16 }}
                      showIcon
                    />
                  )}

                  {/* SEÇÃO: Regime tributário */}
                  <Divider>Regime tributário</Divider>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="regime_tributario" label="Regime tributário">
                        <Select
                          placeholder="Selecione o regime"
                          onChange={setRegime}
                          options={[
                            { value: "mei", label: "MEI" },
                            { value: "simples_nacional", label: "Simples Nacional" },
                            { value: "lucro_presumido", label: "Lucro Presumido" },
                            { value: "lucro_real", label: "Lucro Real" },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="tipo_nota_fiscal" label="Tipo de nota fiscal">
                        <Select
                          placeholder="Selecione o tipo"
                          options={[
                            { value: "nfs_e", label: "NFS-e (Serviços)" },
                            { value: "nf_e", label: "NF-e (Produtos)" },
                            { value: "ambas", label: "Ambas" },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="municipio" label="Município">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Form.Item name="uf" label="UF">
                        <Input disabled maxLength={2} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Form.Item name="codigo_ibge" label="Código IBGE">
                        <Input placeholder="Ex: 3550308" />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* SEÇÃO: ISS — Imposto Sobre Serviços */}
                  <Divider>ISS — Imposto Sobre Serviços</Divider>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="aliquota_iss" label={
                        <span>
                          Alíquota ISS (%)
                          <Tooltip title="Consulte a legislação do seu município">
                            <InfoCircleOutlined style={{ marginLeft: 8, color: '#3B82F6' }} />
                          </Tooltip>
                        </span>
                      }>
                        <InputNumber
                          placeholder="Ex: 5.00"
                          step={0.01}
                          min={0}
                          max={100}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="iss_retido_fonte" label="ISS retido na fonte?">
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="codigo_servico_lc116" label={
                    <span>
                      Código do serviço LC 116/2003
                      <Tooltip title="Código da lista de serviços da LC 116/2003">
                        <InfoCircleOutlined style={{ marginLeft: 8, color: '#3B82F6' }} />
                      </Tooltip>
                    </span>
                  }>
                    <Input placeholder="Ex: 14.01" />
                  </Form.Item>

                  {/* SEÇÃO: Alíquotas — Lucro Presumido */}
                  {regime === "lucro_presumido" && (
                    <>
                      <Divider>Alíquotas — Lucro Presumido</Divider>
                      <Table
                        dataSource={[
                          { imposto: "PIS", aliquota: "0,65%" },
                          { imposto: "COFINS", aliquota: "3,00%" },
                          { imposto: "IRPJ (serviços)", aliquota: "4,80%" },
                          { imposto: "CSLL (serviços)", aliquota: "2,88%" },
                          { imposto: "Total aproximado", aliquota: "~13%" },
                        ]}
                        columns={[
                          { title: "Imposto", dataIndex: "imposto" },
                          { title: "Alíquota", dataIndex: "aliquota" },
                        ]}
                        pagination={false}
                        size="small"
                        style={{ marginBottom: 16 }}
                      />
                      <Alert
                        message="Alíquotas padrão do Lucro Presumido 2025. Consulte seu contador para confirmar."
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                      />
                    </>
                  )}

                  {/* SEÇÃO: Preview de impostos */}
                  <Divider>Preview de impostos</Divider>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="valor_servicos" label="Valor de serviços (R$)">
                        <InputNumber
                          placeholder="0,00"
                          step={0.01}
                          min={0}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="valor_materiais" label="Valor de materiais (R$)">
                        <InputNumber
                          placeholder="0,00"
                          step={0.01}
                          min={0}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Button
                    onClick={calcularImpostos}
                    style={{ ...btnStyle, marginBottom: 24 }}
                  >
                    Calcular impostos
                  </Button>

                  {impostoPreview && (
                    <Card style={{ backgroundColor: '#f5f5f5', marginBottom: 24 }}>
                      <Row gutter={[16, 8]}>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>Subtotal serviços:</strong> R$ {impostoPreview.subtotal_servicos.toFixed(2)}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>Subtotal materiais:</strong> R$ {impostoPreview.subtotal_materiais.toFixed(2)}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>ISS (5%):</strong> R$ {impostoPreview.iss?.toFixed(2) || '0.00'}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>PIS (0,65%):</strong> R$ {impostoPreview.pis?.toFixed(2) || '0.00'}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>COFINS (3%):</strong> R$ {impostoPreview.cofins?.toFixed(2) || '0.00'}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>IRPJ (4,8%):</strong> R$ {impostoPreview.irpj?.toFixed(2) || '0.00'}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>CSLL (2,88%):</strong> R$ {impostoPreview.csll?.toFixed(2) || '0.00'}
                          </div>
                        </Col>
                      </Row>
                      <Divider style={{ margin: '16px 0' }} />
                      <Row gutter={[16, 8]}>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14, color: '#d32f2f' }}>
                            <strong>Total impostos:</strong> R$ {impostoPreview.total_impostos.toFixed(2)}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14, color: '#3B82F6', fontWeight: 'bold' }}>
                            <strong>Total geral:</strong> R$ {impostoPreview.total_geral.toFixed(2)}
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  )}

                  <Button
                    onClick={salvarConfigFiscal}
                    style={{ ...btnStyle, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Salvar configuração fiscal
                  </Button>
                </Form>
              </Spin>
            ),
          },

          // ABA: IMPORTAÇÃO
          {
            key: "importacao",
            label: "Importação",
            children: (
              <div>
                <p style={{ marginBottom: 16 }}>
                  Importar dados via Excel para Clientes, Serviços e Produtos.
                </p>
                <Button
                  onClick={() => setImportModalOpen(true)}
                  style={btnStyle}
                >
                  Abrir Importador
                </Button>
                <ExcelImportModal
                  open={importModalOpen}
                  onClose={() => setImportModalOpen(false)}
                  onSuccess={() => {
                    setImportModalOpen(false);
                    message.success("Dados importados com sucesso!");
                  }}
                />
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}
