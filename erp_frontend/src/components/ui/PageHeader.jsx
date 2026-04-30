import { Breadcrumb } from 'antd';

export default function PageHeader({ title, subtitle, breadcrumbs, actions }) {
  return (
    <div className="erp-page-card" style={{ marginBottom: '24px' }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} style={{ marginBottom: '12px' }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>{title}</h1>
          {subtitle && (
            <p style={{ margin: '8px 0 0 0', color: '#8c8c8c', fontSize: '14px' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div>{actions}</div>}
      </div>
    </div>
  );
}
