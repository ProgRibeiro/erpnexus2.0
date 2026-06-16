import React, { useEffect, useState, useRef } from 'react';
import { Input, Modal, Divider, Empty, Spin } from 'antd';
import { SearchOutlined, BarsOutlined } from '@ant-design/icons';
import { COMMANDS, searchCommands } from '@/services/commandPaletteService';
import './CommandPalette.css';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(COMMANDS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const openPalette = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', openPalette);
    document.addEventListener('open-command-palette', () => setIsOpen(true));

    return () => {
      window.removeEventListener('keydown', openPalette);
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim() === '') {
      setResults(COMMANDS);
    } else {
      setLoading(true);
      const timer = setTimeout(() => {
        setResults(searchCommands(query));
        setLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(Math.max(selectedIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        executeCommand(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const executeCommand = (command) => {
    command.action();
    setIsOpen(false);
    setQuery('');
  };

  const getCategoryLabel = (category) => {
    const labels = {
      navegacao: '🧭 Navegação',
      ordens: '📋 Ordens',
      financeiro: '💰 Financeiro',
      cadastros: '📚 Cadastros',
      vendas: '🏪 Vendas',
      relatorios: '📊 Relatórios',
      sistema: '⚙️ Sistema',
    };
    return labels[category] || category;
  };

  const groupedResults = results.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  return (
    <Modal
      open={isOpen}
      onCancel={() => setIsOpen(false)}
      footer={null}
      width={700}
      className="erp-command-palette-modal"
      bodyStyle={{ padding: 0 }}
      closable={false}
      centered
    >
      <div className="erp-command-palette">
        <div className="erp-command-palette-header">
          <BarsOutlined className="erp-command-icon" />
          <Input
            ref={inputRef}
            placeholder="Procure um comando ou navegue..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="borderless"
            size="large"
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            autoFocus
          />
          <div className="erp-command-hint">ESC para fechar</div>
        </div>

        <Divider style={{ margin: 0 }} />

        <div className="erp-command-palette-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : results.length === 0 ? (
            <Empty
              description="Nenhum comando encontrado"
              style={{ padding: '40px 20px' }}
            />
          ) : (
            Object.entries(groupedResults).map(([category, cmds]) => (
              <div key={category}>
                <div className="erp-command-category">
                  {getCategoryLabel(category)}
                </div>
                {cmds.map((cmd) => {
                  const isSelected = results.indexOf(cmd) === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      className={`erp-command-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(results.indexOf(cmd))}
                    >
                      <div className="erp-command-item-content">
                        <div className="erp-command-item-title">{cmd.title}</div>
                        <div className="erp-command-item-description">{cmd.description}</div>
                      </div>
                      {cmd.shortcut && (
                        <div className="erp-command-item-shortcut">{cmd.shortcut}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <Divider style={{ margin: 0 }} />
        <div className="erp-command-palette-footer">
          <span>⬆️ ⬇️ Navegue • ENTER Executar • ESC Fechar</span>
        </div>
      </div>
    </Modal>
  );
};

export default CommandPalette;
