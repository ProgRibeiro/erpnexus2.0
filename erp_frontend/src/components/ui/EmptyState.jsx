import { Button, Empty } from 'antd';

export default function EmptyState({ title, description, icon, action, actionLabel }) {
  return (
    <div className="erp-page-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
      <Empty
        image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
        description={title}
      >
        {description && (
          <p style={{ color: '#8c8c8c', marginBottom: '16px' }}>
            {description}
          </p>
        )}
        {action && (
          <Button type="primary" onClick={action}>
            {actionLabel || 'Ação'}
          </Button>
        )}
      </Empty>
    </div>
  );
}
