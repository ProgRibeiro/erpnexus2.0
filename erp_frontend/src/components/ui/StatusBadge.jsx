export default function StatusBadge({ status, label }) {
  const statusMap = {
    lead: { class: 'os-status-lead', label: 'Lead' },
    orcamento: { class: 'os-status-orcamento', label: 'Orçamento' },
    aprovado: { class: 'os-status-aprovado', label: 'Aprovado' },
    em_execucao: { class: 'os-status-em-execucao', label: 'Em Execução' },
    faturado: { class: 'os-status-faturado', label: 'Faturado' },
    concluido: { class: 'os-status-concluido', label: 'Concluído' },
    cancelado: { class: 'os-status-cancelado', label: 'Cancelado' },
  };

  const config = statusMap[status] || { class: 'os-status-lead', label: status };

  return (
    <span className={`os-status-badge ${config.class}`}>
      {label || config.label}
    </span>
  );
}
