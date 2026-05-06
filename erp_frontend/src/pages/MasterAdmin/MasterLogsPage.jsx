import { useEffect, useRef, useState } from "react";
import { Button, Input, Select, Switch, Table, Tag, Typography, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import masterApi from "../../services/masterApi";

const { Title, Text } = Typography;

const ACAO_LABELS = {
  login_sucesso: "Login bem-sucedido",
  login_falha: "Tentativa de login falhou",
  bloquear_cliente: "Cliente bloqueado",
  desbloquear_cliente: "Cliente desbloqueado",
  cancelar_cliente: "Cliente cancelado",
  resetar_senha: "Senha resetada",
  aplicar_desconto: "Desconto aplicado",
  confirmar_pagamento: "Pagamento confirmado",
  criar_cliente: "Cliente criado",
  editar_cliente: "Cliente editado",
};

const ACAO_COLORS = {
  login_sucesso: "green",
  login_falha: "red",
  bloquear_cliente: "orange",
  desbloquear_cliente: "blue",
  cancelar_cliente: "red",
  resetar_senha: "purple",
  aplicar_desconto: "cyan",
  confirmar_pagamento: "green",
  criar_cliente: "blue",
  editar_cliente: "geekblue",
};

function formatDatetime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR");
}

export default function MasterLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acaoFiltro, setAcaoFiltro] = useState("");
  const [ipBusca, setIpBusca] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = acaoFiltro ? { acao: acaoFiltro } : {};
      const r = await masterApi.get("/logs/", { params });
      setLogs(Array.isArray(r.data) ? r.data : []);
    } catch {
      message.error("Erro ao carregar logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [acaoFiltro]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(load, 30000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, acaoFiltro]);

  const logsFiltrados = logs.filter((l) => {
    if (ipBusca && !(l.ip || "").includes(ipBusca)) return false;
    return true;
  });

  function renderDetalhes(det) {
    if (!det || Object.keys(det).length === 0) return <Text style={{ color: "#CBD5E1", fontSize: 11 }}>—</Text>;
    return (
      <div style={{
        background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6,
        padding: "4px 8px", fontSize: 11, color: "#64748B", fontFamily: "monospace",
        maxWidth: 280, overflow: "hidden",
      }}>
        {Object.entries(det).map(([k, v]) => (
          <div key={k}><Text style={{ color: "#94A3B8", fontSize: 10 }}>{k}:</Text> {String(v)}</div>
        ))}
      </div>
    );
  }

  const columns = [
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "ts",
      width: 160,
      render: (v) => <Text style={{ fontSize: 12, color: "#374151" }}>{formatDatetime(v)}</Text>,
    },
    {
      title: "Ação",
      dataIndex: "acao",
      key: "acao",
      width: 200,
      render: (v, r) => (
        <Tag color={ACAO_COLORS[v] || "default"} style={{ fontSize: 11 }}>
          {r.acao_display || ACAO_LABELS[v] || v}
        </Tag>
      ),
    },
    {
      title: "Detalhes",
      dataIndex: "detalhes",
      key: "det",
      render: (v) => renderDetalhes(v),
    },
    {
      title: "IP",
      dataIndex: "ip",
      key: "ip",
      width: 130,
      render: (v) => <Text style={{ fontSize: 12, fontFamily: "monospace", color: "#64748B" }}>{v || "—"}</Text>,
    },
  ];

  return (
    <div style={{ padding: 28, background: "#F8FAFC", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Title level={4} style={{ margin: 0, color: "#0F172A" }}>Logs de Acesso</Title>
          <Text style={{ color: "#94A3B8", fontSize: 13 }}>{logsFiltrados.length} registros</Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 12, color: "#64748B" }}>Auto-refresh 30s</Text>
          <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
          <Button icon={<ReloadOutlined />} size="small" onClick={load} loading={loading}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Select
          placeholder="Filtrar por ação" allowClear value={acaoFiltro || undefined}
          onChange={(v) => setAcaoFiltro(v || "")} style={{ width: 220 }}
        >
          {Object.entries(ACAO_LABELS).map(([k, v]) => (
            <Select.Option key={k} value={k}>{v}</Select.Option>
          ))}
        </Select>
        <Input
          placeholder="Buscar por IP..."
          value={ipBusca}
          onChange={(e) => setIpBusca(e.target.value)}
          style={{ width: 180 }}
          allowClear
        />
      </div>

      {/* Tabela */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <Table
          columns={columns}
          dataSource={logsFiltrados}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 50 }}
        />
      </div>
    </div>
  );
}