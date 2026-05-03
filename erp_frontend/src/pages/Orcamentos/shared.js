import dayjs from "dayjs";

export const pageStyle = {
  minHeight: "100vh",
  background: "#F4F6F9",
  padding: 24,
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export const panelStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

export const btnPrimaryStyle = {
  background: "#3B82F6",
  borderColor: "#3B82F6",
  color: "#ffffff",
  fontWeight: 500,
  height: "38px",
  borderRadius: "8px",
};

export const serviceOptions = [
  { label: "HVAC", value: "hvac" },
  { label: "Refrigeração", value: "refrigeracao" },
  { label: "Elétrica", value: "eletrica" },
  { label: "Civil", value: "civil" },
  { label: "Preventiva", value: "manutencao" },
  { label: "Instalação", value: "instalacao" },
];

export const priorityOptions = [
  { label: "Normal", value: "media" },
  { label: "Urgente", value: "alta" },
  { label: "Emergência", value: "urgente" },
];

export const paymentOptions = [
  { label: "À vista/Pix", value: "pix" },
  { label: "30 dias", value: "30_dias" },
  { label: "30/60 dias", value: "30_60_dias" },
  { label: "30/60/90 dias", value: "30_60_90_dias" },
  { label: "Boleto", value: "boleto" },
  { label: "Cartão", value: "cartao" },
];

export const segmentOptions = [
  { label: "Indústria", value: "industria" },
  { label: "Comércio", value: "comercio" },
  { label: "Residencial", value: "residencial" },
  { label: "Condomínio", value: "condominio" },
  { label: "Serviços", value: "servicos" },
  { label: "Governo", value: "governo" },
];

export const itemOriginOptions = [
  { label: "Serviços", value: "servico" },
  { label: "Produtos", value: "produto" },
  { label: "Avulso", value: "avulso" },
];

export const serviceUnitOptions = [
  { label: "Hora", value: "hora" },
  { label: "Dia", value: "dia" },
  { label: "Unitário", value: "uni" },
  { label: "Lote", value: "lote" },
];

export const productUnitOptions = [
  { label: "Unidade", value: "un" },
  { label: "Metro", value: "m" },
  { label: "Metro quadrado", value: "m2" },
  { label: "Quilograma", value: "kg" },
  { label: "Litro", value: "litro" },
  { label: "Par", value: "par" },
  { label: "Caixa", value: "caixa" },
];

export const tributacaoOptions = [
  { label: "ISS", value: "iss" },
  { label: "ICMS", value: "icms" },
  { label: "PIS/COFINS", value: "pis_cofins" },
];

export const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatMoneyTrailing(value) {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}R$`;
}

export function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export function buildBudgetNumber(sequence = 1) {
  return `ORC-${dayjs().year()}-${String(sequence).padStart(4, "0")}`;
}

export function maskCNPJ(value) {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .substring(0, 18);
}

export function maskPhone(value) {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .substring(0, 15);
}

export function maskCEP(value) {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .substring(0, 9);
}

export function createEmptyItem(index = 0) {
  return {
    key: `item-${Date.now()}-${index}`,
    origem_tipo: "avulso",
    produto: null,
    servico: null,
    codigo_referencia: "",
    unidade_referencia: "un",
    descricao: "",
    quantidade: 1,
    valor_unitario: 0,
  };
}

export function mapProdutoToItem(produto) {
  return {
    key: `produto-${produto.id}-${Date.now()}`,
    origem_tipo: "produto",
    produto: produto.id,
    servico: null,
    codigo_referencia: produto.codigo || "",
    unidade_referencia: produto.unidade_medida || "un",
    descricao: produto.nome,
    quantidade: 1,
    valor_unitario: Number(produto.preco_venda || 0),
  };
}

export function mapServicoToItem(servico) {
  return {
    key: `servico-${servico.id}-${Date.now()}`,
    origem_tipo: "servico",
    produto: null,
    servico: servico.id,
    codigo_referencia: servico.codigo || "",
    unidade_referencia: servico.unidade_medida || "uni",
    descricao: servico.nome,
    quantidade: 1,
    valor_unitario: Number(servico.preco_padrao || 0),
  };
}

export function mapBackendItem(item, index = 0) {
  return {
    key: item.id || `item-${index}`,
    id: item.id,
    origem_tipo: item.origem_tipo || "avulso",
    produto: item.produto || null,
    servico: item.servico || null,
    codigo_referencia: item.codigo_referencia || item.produto_codigo || item.servico_codigo || "",
    unidade_referencia: item.unidade_referencia || "un",
    descricao: item.descricao || "",
    quantidade: Number(item.quantidade || 0),
    valor_unitario: Number(item.valor_unitario || 0),
  };
}

export function buildItemsPayload(items) {
  return items.map((item, index) => ({
    id: item.id,
    origem_tipo: item.origem_tipo || "avulso",
    produto: item.produto || null,
    servico: item.servico || null,
    codigo_referencia: item.codigo_referencia || "",
    unidade_referencia: item.unidade_referencia || "",
    descricao: item.descricao || `Item ${index + 1}`,
    quantidade: Number(item.quantidade || 0),
    valor_unitario: Number(item.valor_unitario || 0),
    ordem: index,
  }));
}

export function calcItemsTotals(items) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantidade || 0) * Number(item.valor_unitario || 0),
    0
  );
  const valorServicos = items
    .filter((item) => item.origem_tipo !== "produto")
    .reduce((sum, item) => sum + Number(item.quantidade || 0) * Number(item.valor_unitario || 0), 0);
  const valorMateriais = items
    .filter((item) => item.origem_tipo === "produto")
    .reduce((sum, item) => sum + Number(item.quantidade || 0) * Number(item.valor_unitario || 0), 0);

  return {
    subtotal,
    valorServicos,
    valorMateriais,
  };
}

export function formatBudgetStatus(status) {
  const map = {
    rascunho: { label: "Rascunho", color: "default" },
    enviado: { label: "Enviado", color: "blue" },
    aprovado: { label: "Aprovado", color: "green" },
    recusado: { label: "Recusado", color: "red" },
    expirado: { label: "Expirado", color: "orange" },
  };
  return map[status] || map.rascunho;
}
