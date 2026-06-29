import { useEffect, useRef, useState } from "react";
import { Button, Empty, Input, Select, Switch, Table, Tag, Typography, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import masterApi from "../../services/masterApi";

const { Title, Text } = Typography;

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
    if (!det || Object.keys(det).length === 0) return <Text style={{ color: colors.textoFraco, fontSize: 11 }}>—</Text>;
    return (
      <div style={{
        background: colors.fundoSuave, border: `1px solid ${colors.borda}`, borderRadius: 8,
        padding: "4px 8px", fontSize: 11, color: colors.textoSecundario, fontFamily: "monospace",
        maxWidth: 280, overflow: "hidden",
      }}>
        {Object.entries(det).map(([k, v]) => (
          <div key={k}><Text style={{ color: colors.textoFraco, fontSize: 10 }}>{k}:</Text> {String(v)}</div>
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
      render: (v) => <Text style={{ fontSize: 12, color: colors.textoSecundario }}>{formatDatetime(v)}</Text>,
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
      render: (v) => <Text style={{ fontSize: 12, fontFamily: "monospace", color: colors.textoSecundario }}>{v || "—"}</Text>,
    },
  ];

  return (
    <div style={{ padding: 28, background: colors.fundoSuave, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Title level={4} style={{ margin: 0, color: colors.texto }}>Logs de Acesso</Title>
          <Text style={{ color: colors.textoFraco, fontSize: 13 }}>{logsFiltrados.length} registros</Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 12, color: colors.textoSecundario }}>Auto-refresh 30s</Text>
          <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
          <Button icon={<ReloadOutlined />} size="small" onClick={load} loading={loading} style={{ borderRadius: 6 }}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap",
        background: "#fff", border: `1px solid ${colors.borda}`, borderRadius: 14,
        padding: "14px 18px", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
      }}>
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
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${colors.borda}`, overflow: "hidden", boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)" }}>
        <Table
          columns={columns}
          dataSource={logsFiltrados}
          rowKey="id"
          loading={{ spinning: loading, tip: "Carregando logs..." }}
          size="small"
          pagination={{ pageSize: 50 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nenhum log encontrado"
                style={{ padding: "32px 0" }}
              />
            ),
          }}
          scroll={{ x: 800 }}
        />
      </div>
    </div>
  );
}