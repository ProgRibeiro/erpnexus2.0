export default function ValorMargem({ faturado, despesas }) {
  const margem = faturado - despesas;
  const percentualMargem = faturado > 0 ? ((margem / faturado) * 100).toFixed(1) : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
      <div className="erp-page-card">
        <div className="erp-metric-label">Faturado</div>
        <div className="erp-metric-value" style={{ color: '#1A7A4A' }}>
          R$ {faturado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      <div className="erp-page-card">
        <div className="erp-metric-label">Despesas</div>
        <div className="erp-metric-value" style={{ color: '#B91C1C' }}>
          R$ {despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      <div className="erp-page-card">
        <div className="erp-metric-label">Margem</div>
        <div className="erp-metric-value" style={{ color: margem >= 0 ? '#1A7A4A' : '#B91C1C' }}>
          {percentualMargem}%
        </div>
        <div className="erp-metric-change" style={{ color: margem >= 0 ? '#1A7A4A' : '#B91C1C' }}>
          R$ {margem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}
