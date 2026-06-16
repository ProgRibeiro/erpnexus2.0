import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Row, Col, Empty } from 'antd';
import { getAllShortcuts, getShortcutsByCategory } from '@/services/keyboardService';
import './ShortcutsModal.css';

const ShortcutsModal = ({ open, onClose }) => {
  const [shortcuts, setShortcuts] = useState([]);

  useEffect(() => {
    setShortcuts(getAllShortcuts());
  }, []);

  const renderShortcut = (shortcut) => (
    <div key={shortcut.id} className="shortcut-item">
      <div className="shortcut-label">
        <span className="shortcut-title">{shortcut.label}</span>
      </div>
      <div className="shortcut-keys">
        {shortcut.keys.map((key, idx) => (
          <React.Fragment key={key}>
            {idx > 0 && <span className="key-separator">+</span>}
            <kbd className="key-badge">{key}</kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const navShortcuts = getShortcutsByCategory('navigation');
  const newShortcuts = getShortcutsByCategory('new');
  const globalShortcuts = getShortcutsByCategory('global');

  return (
    <Modal
      title="⌨️ Atalhos de Teclado"
      open={open}
      onCancel={onClose}
      width={800}
      footer={null}
      className="shortcuts-modal"
    >
      <Tabs
        items={[
          {
            key: 'navigation',
            label: '🧭 Navegação',
            children: (
              <div className="shortcuts-list">
                {navShortcuts.map(renderShortcut)}
              </div>
            ),
          },
          {
            key: 'new',
            label: '✨ Criar Novos',
            children: (
              <div className="shortcuts-list">
                {newShortcuts.map(renderShortcut)}
              </div>
            ),
          },
          {
            key: 'global',
            label: '⚙️ Global',
            children: (
              <div className="shortcuts-list">
                {globalShortcuts.map(renderShortcut)}
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default ShortcutsModal;
