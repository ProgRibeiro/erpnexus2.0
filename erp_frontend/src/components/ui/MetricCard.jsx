import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

export default function MetricCard({
  label,
  value,
  prefix = '',
  suffix = '',
  trend,
  trendLabel,
  icon: Icon,
  color = '#1B4F8A'
}) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div className="erp-metric-card">
      <div className="metric-label">
        {Icon && <Icon style={{ color }} />}
        {label}
      </div>
      <div className="metric-value" style={{ color }}>
        {prefix}{value}{suffix}
      </div>
      {trend !== undefined && (
        <div className={`metric-sub metric-${isPositive ? 'up' : 'down'}`}>
          {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          {' '}{Math.abs(trend)}% {trendLabel}
        </div>
      )}
    </div>
  );
}
