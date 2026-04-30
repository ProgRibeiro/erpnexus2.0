import { Space, Button, Input, Select } from 'antd';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';

export default function FilterBar({ filters, onApply, onClear, loading }) {
  return (
    <div className="erp-page-card">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {filters}
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={onApply}
            loading={loading}
          >
            Filtrar
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={onClear}
          >
            Limpar
          </Button>
        </div>
      </Space>
    </div>
  );
}
