# 🎯 ERP Nexus — Comandos, Atalhos e Integrações

## ⌨️ Command Palette (Cmd+K / Ctrl+K)

Abra a paleta de comandos para navegar ou executar ações rapidamente:

- **Mac**: `Cmd + K`
- **Windows/Linux**: `Ctrl + K`

Dentro da paleta:
- ↑/↓ para navegar
- Enter para executar
- Esc para fechar

---

## 🧭 Atalhos de Navegação

| Atalho | Ação | Plataforma |
|--------|------|-----------|
| `Alt + O` | Ir para Ordens | Todas |
| `Alt + F` | Ir para Financeiro | Todas |
| `Alt + C` | Ir para Cadastros | Todas |
| `Alt + L` | Ir para Clientes | Todas |
| `Alt + K` | Ir para CRM | Todas |
| `Home` | Dashboard | Todas |

---

## ✨ Atalhos para Criar Novos

| Atalho | Ação | Plataforma |
|--------|------|-----------|
| `Ctrl + Alt + O` | Nova Ordem de Serviço | Todas |
| `Ctrl + Alt + L` | Novo Lançamento Financeiro | Todas |
| `Ctrl + Alt + Q` | Novo Orçamento | Todas |
| `Ctrl + Alt + C` | Novo Cliente | Todas |

---

## ⚙️ Atalhos Globais

| Atalho | Ação | Plataforma |
|--------|------|-----------|
| `Ctrl + /` | Ver Atalhos | Todas |
| `Ctrl + Q` | Sair / Logout | Todas |

---

## 🔌 Integrações Disponíveis

### Fiscal
- `consultarCNPJ(cnpj)` — Consulta CNPJ via BrasilAPI
- `calcularImpostos(dados)` — Calcula impostos (MEI, Simples, Lucro Presumido, Lucro Real)

### Comunicação
- `enviarSMS(telefone, mensagem)` — Envia SMS
- `enviarWhatsApp(numero, mensagem)` — Envia WhatsApp
- `enviarEmail(destinatario, assunto, corpo, anexos)` — Envia email

### Pagamentos
- `criarCheckout(pedido)` — Cria link de checkout
- `consultarPagamento(id)` — Consulta status do pagamento

### Mapas
- `obterCoordenadas(endereco)` — Busca coordenadas (OpenStreetMap)
- `calcularRota(origem, destino)` — Calcula rota (OSRM)

### Storage
- `uploadArquivo(arquivo)` — Upload para servidor local
- `sincronizarComNuvem(arquivo)` — Futuro: sincronização com Google Drive/Dropbox

### Webhooks
- `subscribe(eventType, callback)` — Inscrever em evento
- `emit(eventType, data)` — Dispara evento
- `unsubscribe(eventType, callback)` — Desinscrever

### Notificações
- `requestPermission()` — Pedir permissão de notificações push
- `send(titulo, opcoes)` — Enviar notificação

### Cache
- `set(key, value, ttl)` — Salvar em cache (default: 1 hora)
- `get(key)` — Recuperar do cache
- `clear(key)` — Limpar chave
- `clearAll()` — Limpar tudo

### Sistema
- `checkBackendHealth()` — Verifica saúde do backend
- `checkDatabaseHealth()` — Verifica saúde do BD
- `startHeartbeat(interval)` — Inicia monitoramento

---

## 📝 Como Usar as Integrações no Código

### Exemplo 1: Consultar CNPJ
```javascript
import integrationsService from '@/services/integrationsService';

const dados = await integrationsService.fiscal.consultarCNPJ('11222333000181');
console.log(dados); // { razao_social, endereco, telefone, ... }
```

### Exemplo 2: Enviar Email
```javascript
await integrationsService.communication.enviarEmail(
  'cliente@example.com',
  'Sua OS foi criada',
  'A ordem de serviço #123 foi criada com sucesso',
  []
);
```

### Exemplo 3: Usar Cache
```javascript
// Salvar resultado por 10 minutos
integrationsService.cache.set('cliente_123', dadosCliente, 600000);

// Recuperar depois
const dados = integrationsService.cache.get('cliente_123');
```

### Exemplo 4: Webhooks
```javascript
import { webhookService } from '@/services/integrationsService';

// Inscrever em evento de nova OS
webhookService.subscribe('nova-os', (dados) => {
  console.log('Nova OS criada:', dados);
  notificationService.send('Nova OS', { body: `OS #${dados.id}` });
});

// Em outro lugar, disparar o evento
webhookService.emit('nova-os', { id: 123, cliente: 'João' });
```

---

## 🚀 Inicialização Automática

Ao abrir o ERP:
1. ✅ Command Palette ativada (Cmd+K)
2. ✅ Atalhos de teclado registrados
3. ✅ Notificações push solicitadas
4. ✅ Heartbeat do sistema iniciado (30s)
5. ✅ Webhooks prontos para uso

---

## 📋 Como Adicionar Novos Comandos

Edite `src/services/commandPaletteService.js` e adicione um novo comando:

```javascript
{
  id: 'meu-comando',
  category: COMMAND_CATEGORIES.SISTEMA,
  title: 'Meu Comando',
  description: 'Descrição do que faz',
  icon: 'icon-name',
  shortcut: 'Ctrl+Alt+M',
  action: () => {
    // Sua lógica aqui
    console.log('Executado!');
  },
  priority: 50,  // Quanto maior, mais no topo da busca
},
```

---

## 🎨 Customização

### Cores do Command Palette
Edite `src/components/CommandPalette/CommandPalette.css`:
- `.erp-command-palette-header` — Header
- `.erp-command-item.selected` — Item selecionado
- `.key-badge` — Badges de atalho

### Categorias de Comando
Adicione em `COMMAND_CATEGORIES` em `commandPaletteService.js`:
```javascript
COMANDO_CUSTOM: 'comando_custom',
```

---

## 🐛 Troubleshooting

### Atalho não funciona
1. Verifique se não há conflito com atalho do navegador/SO
2. Confirme que o campo de input não está focado (alguns atalhos são bloqueados em inputs)

### Command Palette não abre
1. Confirme que `CommandPalette` está importado em `App.jsx`
2. Verifique o console para erros
3. Teste: `document.dispatchEvent(new CustomEvent('open-command-palette'))`

### Integrações não funcionam
1. Verifique conexão com backend (`checkBackendHealth()`)
2. Confirme que endpoints existem em `/api/v1/`
3. Veja logs do console (F12 > Console)

---

## 📞 Suporte

- Gerar relatório de atalhos: `printShortcuts()` no console
- Verificar saúde do sistema: `integrationsService.health.checkBackendHealth()`
- Listar todos os comandos: `COMMANDS` no console
