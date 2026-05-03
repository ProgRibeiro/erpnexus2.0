const statusConfig = {
  lead:       { label: 'Lead',          className: 'status-lead' },
  orcamento:  { label: 'Orçamento',     className: 'status-orcamento' },
  aprovado:   { label: 'Aprovado',      className: 'status-aprovado' },
  em_execucao:{ label: 'Em execução',   className: 'status-execucao' },
  faturado:   { label: 'Faturado',      className: 'status-faturado' },
  concluido:  { label: 'Concluído',     className: 'status-concluido' },
  cancelado:  { label: 'Cancelado',     className: 'status-cancelado' },
  atrasado:   { label: 'Atrasado',      className: 'status-atrasado' },
};

export default function StatusBadge({ status, label }) {
  const config = statusConfig[status] || statusConfig.lead;
  return <span className={`status-badge ${config.className}`}>{label || config.label}</span>;
}
