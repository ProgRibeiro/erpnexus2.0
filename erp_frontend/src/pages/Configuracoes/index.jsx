import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Switch, Table, Tabs, message } from "antd";

import configuracoesService from "../../services/configuracoes";

export default function ConfiguracoesPage() {
  const [empresaForm] = Form.useForm();
  const [notificacoes, setNotificacoes] = useState([]);

  useEffect(() => {
    configuracoesService
      .obterEmpresa()
      .then((data) => empresaForm.setFieldsValue(data))
      .catch(() => {
        empresaForm.resetFields();
      });

    configuracoesService
      .listarNotificacoes()
      .then(setNotificacoes)
      .catch(() => {
        setNotificacoes([]);
      });
  }, [empresaForm]);

  const salvarEmpresa = async (values) => {
    await configuracoesService.salvarEmpresa(values);
    message.success("Empresa salva");
  };

  const salvarNotificacoes = async () => {
    await configuracoesService.salvarNotificacoes(notificacoes);
    message.success("Notificacoes salvas");
  };

  return (
    <Card>
      <Tabs
        items={[
          {
            key: "empresa",
            label: "Empresa",
            children: (
              <Form form={empresaForm} layout="vertical" onFinish={salvarEmpresa}>
                <Form.Item name="nome" label="Nome"><Input /></Form.Item>
                <Form.Item name="razao_social" label="Razao social"><Input /></Form.Item>
                <Form.Item name="cnpj" label="CNPJ"><Input /></Form.Item>
                <Form.Item name="endereco" label="Endereco"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item name="telefone" label="Telefone"><Input /></Form.Item>
                <Form.Item name="email" label="Email"><Input /></Form.Item>
                <Form.Item name="site" label="Site"><Input /></Form.Item>
                <Form.Item name="cor_principal" label="Cor principal"><Input /></Form.Item>
                <Button type="primary" htmlType="submit">Salvar</Button>
              </Form>
            ),
          },
          {
            key: "notificacoes",
            label: "Notificacoes",
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
                            next[index] = { ...record, email_destino: event.target.value };
                            setNotificacoes(next);
                          }}
                        />
                      ),
                    },
                  ]}
                />
                <Button type="primary" onClick={salvarNotificacoes}>Salvar notificacoes</Button>
              </>
            ),
          },
        ]}
      />
    </Card>
  );
}
