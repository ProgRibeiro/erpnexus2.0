export const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export const statusConfig = {
  rascunho: { label: "Rascunho", color: "default" },
  ativo: { label: "Ativo", color: "green" },
  suspenso: { label: "Suspenso", color: "orange" },
  encerrado: { label: "Encerrado", color: "blue" },
  rescindido: { label: "Rescindido", color: "red" },
};

export const periodicidadeOptions = [
  { value: "mensal", label: "Mensal" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "quadrimestral", label: "Quadrimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

export const pageStyle = {
  minHeight: "100vh",
  background: "#F8FAFC",
  padding: 24,
};
