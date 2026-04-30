export default function MetricCard({ label, value, change, trend = 'neutral' }) {
  return (
    <div className="erp-metric-card">
      <div className="erp-metric-label">{label}</div>
      <div className="erp-metric-value">{value}</div>
      {change !== undefined && (
        <div className={`erp-metric-change ${trend}`}>
          {trend === 'positive' && '↑ '}
          {trend === 'negative' && '↓ '}
          {change}
        </div>
      )}
    </div>
  );
}
