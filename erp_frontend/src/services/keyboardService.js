/**
 * Keyboard Shortcuts Service
 * Gerencia atalhos globais de teclado
 */

export const SHORTCUTS = {
  // Navegação (Alt+)
  ALT_O: { keys: ['Alt', 'O'], action: 'nav-ordens', label: 'Ir para Ordens' },
  ALT_F: { keys: ['Alt', 'F'], action: 'nav-financeiro', label: 'Ir para Financeiro' },
  ALT_C: { keys: ['Alt', 'C'], action: 'nav-cadastros', label: 'Ir para Cadastros' },
  ALT_L: { keys: ['Alt', 'L'], action: 'nav-clientes', label: 'Ir para Clientes' },
  ALT_K: { keys: ['Alt', 'K'], action: 'nav-crm', label: 'Ir para CRM' },
  
  // Novos (Ctrl+Alt+)
  CTRL_ALT_O: { keys: ['Control', 'Alt', 'O'], action: 'novo-ordem', label: 'Nova Ordem' },
  CTRL_ALT_L: { keys: ['Control', 'Alt', 'L'], action: 'novo-lancamento', label: 'Novo Lançamento' },
  CTRL_ALT_Q: { keys: ['Control', 'Alt', 'Q'], action: 'novo-orcamento', label: 'Novo Orçamento' },
  CTRL_ALT_C: { keys: ['Control', 'Alt', 'C'], action: 'novo-cliente', label: 'Novo Cliente' },
  
  // Globais
  CMD_K: { keys: ['Meta', 'K'], action: 'buscar', label: 'Command Palette' },
  CTRL_K: { keys: ['Control', 'K'], action: 'buscar', label: 'Command Palette' },
  CTRL_SLASH: { keys: ['Control', '/'], action: 'atalhos', label: 'Ver Atalhos' },
  CTRL_Q: { keys: ['Control', 'Q'], action: 'sair', label: 'Sair' },
  
  // Navegação Rápida
  HOME: { keys: ['Home'], action: 'nav-dashboard', label: 'Dashboard' },
};

const keyboardListeners = new Map();

export const registerKeyboardShortcut = (shortcutKey, handler) => {
  const shortcut = SHORTCUTS[shortcutKey];
  if (!shortcut) {
    console.warn(`Atalho ${shortcutKey} não encontrado`);
    return;
  }

  const listener = (event) => {
    if (matchesShortcut(event, shortcut.keys)) {
      event.preventDefault();
      handler();
    }
  };

  document.addEventListener('keydown', listener);
  keyboardListeners.set(shortcutKey, listener);
};

export const unregisterKeyboardShortcut = (shortcutKey) => {
  const listener = keyboardListeners.get(shortcutKey);
  if (listener) {
    document.removeEventListener('keydown', listener);
    keyboardListeners.delete(shortcutKey);
  }
};

const matchesShortcut = (event, keys) => {
  const pressed = {
    Control: event.ctrlKey,
    Meta: event.metaKey,
    Alt: event.altKey,
    Shift: event.shiftKey,
  };

  for (const key of keys) {
    if (key in pressed) {
      if (!pressed[key]) return false;
    } else {
      if (event.key.toUpperCase() !== key.toUpperCase() && event.code !== key) {
        return false;
      }
    }
  }
  return true;
};

export const getAllShortcuts = () => {
  return Object.entries(SHORTCUTS).map(([key, value]) => ({
    ...value,
    id: key,
  }));
};

export const getShortcutsByCategory = (category) => {
  return getAllShortcuts().filter(s => {
    if (category === 'navigation') return ['ALT_O', 'ALT_F', 'ALT_C', 'ALT_L', 'ALT_K', 'HOME'].includes(s.id);
    if (category === 'new') return ['CTRL_ALT_O', 'CTRL_ALT_L', 'CTRL_ALT_Q', 'CTRL_ALT_C'].includes(s.id);
    if (category === 'global') return ['CMD_K', 'CTRL_K', 'CTRL_SLASH', 'CTRL_Q'].includes(s.id);
    return false;
  });
};

export const printShortcuts = () => {
  const groups = {
    'Navegação Rápida': getShortcutsByCategory('navigation'),
    'Criar Novos': getShortcutsByCategory('new'),
    'Global': getShortcutsByCategory('global'),
  };

  Object.entries(groups).forEach(([group, shortcuts]) => {
    console.group(`%c${group}`, 'font-weight: bold; color: #3B82F6;');
    shortcuts.forEach(s => {
      const keys = s.keys.join(' + ');
      console.log(`%c${keys.padEnd(30)} ${s.label}`, 'color: #10B981;');
    });
    console.groupEnd();
  });
};
