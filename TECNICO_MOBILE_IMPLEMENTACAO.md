## Implementação: Tela Mobile do Técnico (C4) - ERP

### Visão Geral

Sistema completo para gerenciamento de ordens de serviço em campo, otimizado para dispositivos móveis com suporte offline, captura de fotos, assinatura digital e chat interno.

---

## Estrutura de Arquivos Criados

### 1. Componentes

#### `/src/components/SignatureCanvas.jsx` + `.css`
- Canvas para coleta de assinatura do cliente
- Interface intuitiva com touch support
- Funcionalidades:
  - Desenho com mouse ou toque
  - Botão limpar/refazer
  - Confirmação de assinatura
  - Exportação como PNG (base64)

### 2. Hooks (Camada de Lógica)

#### `/src/hooks/useIndexedDB.js`
- **Objetivo**: Gerenciar armazenamento offline com IndexedDB
- **Stores**:
  - `offline_fotos`: Fotos capturadas offline
  - `sync_queue`: Fila de sincronização (chegada, laudo, conclusão, mensagens)
  - `os_cache`: Cache de OS para consulta offline
- **Métodos principais**:
  - `saveFotoOffline(osId, fotoData, tipo)`: Salvar foto
  - `getOffllineFotos(osId)`: Recuperar fotos offline
  - `getUnsyncedFotos(osId)`: Fotos não sincronizadas
  - `addToSyncQueue(osId, action, data)`: Enfileirar ação
  - `getUnsyncedItems()`: Obter itens não sincronizados
  - `cacheOS(osData)`: Cachear OS
  - `clearOldData()`: Limpar dados com >30 dias

#### `/src/hooks/useSyncManager.js`
- **Objetivo**: Gerenciar sincronização automática
- **Funcionalidades**:
  - Sincronizar fotos quando voltar online
  - Sincronizar fila de ações (chegada, laudo, conclusão)
  - Event listener para evento 'online'
  - Retry automático (máx 3 tentativas)
  - Notificações visuais

#### `/src/hooks/useBackgroundSync.js`
- **Objetivo**: Sincronização periódica em background
- **Comportamento**:
  - Sincroniza a cada 30 segundos (configurável)
  - Apenas quando online
  - Sincroniza fotos + ações pendentes

#### `/src/hooks/useIsMobile.js` (Existente - Melhorado)
- Detecta automaticamente se é mobile (< 768px)
- Redireciona automaticamente para `/tecnico-mobile`

#### `/src/hooks/useOffline.js` (Existente - Suplementado)
- Detecta status online/offline
- Funções herdadas mantidas para compatibilidade

### 3. Páginas

#### `/src/pages/TecnicoMobile/index.jsx`
**"Minhas OS de Hoje" - Página Principal**

Funcionalidades:
- ✓ Listagem de ordens do dia com atualização automática (30s)
- ✓ Cards grandes e legíveis (fonte >= 16px)
- ✓ Botões >= 48px de altura
- ✓ Exibição de:
  - Número OS
  - Cliente (nome)
  - Endereço
  - Telefone
  - Horário agendado
  - Status com badge colorido
  - Contador de fotos
- ✓ Botões:
  - "Iniciar Atendimento" (50px, azul)
  - "Ver Endereço" (Google Maps)
  - "Navegar" (Navegação com direções)
- ✓ Botão refresh com loading
- ✓ Carregamento do cache se offline
- ✓ Redirecionamento automático se não é mobile

#### `/src/pages/TecnicoMobile/OSCampo.jsx`
**"Ordem de Serviço em Campo" - Detalhamento**

Funcionalidades:

**Header**:
- Número OS com botão copiar
- Nome do cliente (tag)
- Endereço completo
- Timeline com horários (chegada/conclusão)
- Status da OS (Em Atendimento/Concluída)

**Botão Registrar Chegada** (56px altura):
- Marca `hora_inicio` com timestamp
- Muda status para `em_progresso`
- Offline: enfileira ação

**Seção Fotos**:
- Botão "Foto ANTES do atendimento" (50px)
- Botão "Foto DEPOIS do atendimento" (50px)
- Capture automático: `capture="environment"`
- Grid 2x1 no mobile com miniaturas
- Botão de delete por foto
- Suporte offline: salva em IndexedDB

**Seção Laudo**:
- Textarea 5 linhas (16px font)
- Limite 2000 caracteres
- Mostrador de caracteres

**Seção Chat**:
- Exibição de mensagens internas
- Cada mensagem com: usuário, conteúdo, hora
- Input textarea para nova mensagem
- Botão "Enviar Mensagem" (48px)
- Offline: enfileira mensagem

**Seção Assinatura**:
- Canvas para assinatura
- Modal overlay elegante
- Botão "Obter Assinatura do Cliente"
- Se já assinado: exibir imagem + "Refazer Assinatura"

**Botão Finalizar Serviço** (56px, vermelho):
- Modal de confirmação
- Marca `hora_conclusao`
- Marca status como `concluida`
- Envia `assinatura_cliente`
- Sincroniza fotos
- Redireciona para lista
- Offline: enfileira finalização

**Banner Offline**:
- Fixo no bottom (antes do bottom nav)
- Aviso visual destacado

### 4. Utilitários

#### `/src/utils/tecnicoMobileUtils.js`
Funções auxiliares:
- `formatarHora(isoString)`: ISO → HH:mm
- `formatarDataHora(isoString)`: ISO → dd/mm/yyyy HH:mm
- `requestCameraPermission()`: Verificar permissão câmera
- `blobToBase64(blob)`: Conversão
- `isOfflineMode()`: Verificar online/offline
- `calcularDuracao(inicio, fim)`: Duração do atendimento
- `gerarIdUnico(prefixo)`: ID único
- `comprimirImagem(file, maxW, maxH, quality)`: Compressão
- `salvarLocalmente(dados, nome)`: Debug local
- `obterLocalmente(nome)`: Recuperar debug

### 5. Estilos

#### `/src/pages/TecnicoMobile/TecnicoMobile.css`

Características:
- **Fonts**: Mínimo 16px em controles, 15px em textos
- **Botões**: Mínimo 48-56px de altura
- **Cores**: Brand #1B4F8A com bom contraste
- **Responsividade**: Otimizado para 320px+ e hidden em >768px
- **Toque**: Área interativa > 44x44px
- **Acessibilidade**: Ícones + texto sempre
- **Grid**: 2 colunas máximo em fotos
- **Espaçamento**: Gaps 12-16px para fácil toque

---

## Fluxo de Dados

### Online (Sincrônico)
```
User Action (Clique)
  ↓
API Call
  ↓
State Update
  ↓
UI Refresh
```

### Offline (Assíncrono com Fila)
```
User Action
  ↓
IndexedDB Save (Foto/Ação)
  ↓
State Update (Otimista)
  ↓
UI Refresh (Imediata)
  ↓
[Quando voltar online]
  ↓
useSyncManager dispara
  ↓
Processa fila sequencialmente
  ↓
API Calls com retry
  ↓
Limpa IndexedDB sincronizado
```

---

## Integração PWA/Offline

### 1. Fotos Offline
- Capturadas → Base64 → IndexedDB
- Quando online → Upload para API
- Mostradas na UI como "foto-timestamp"

### 2. Ações em Fila
- Registrar chegada: `{ osId, action: 'registrar_chegada', data: { chegada_em } }`
- Atualizar laudo: `{ osId, action: 'atualizar_laudo', data: { laudo } }`
- Finalizar: `{ osId, action: 'finalizar_os', data: { laudo, concluido_em, assinatura } }`
- Mensagens: `{ osId, action: 'enviar_mensagem', data: { conteudo } }`

### 3. Auto-sincronização
- Event listener para 'online'
- useBackgroundSync a cada 30s
- Retry automático até 3x
- Limpeza de dados com >30 dias

---

## Como Usar

### Para o Técnico
1. Acessar `/tecnico-mobile` (mobile)
2. Ver ordens de hoje
3. Clicar em "Iniciar Atendimento"
4. Registrar chegada
5. Tirar fotos (antes e depois)
6. Preencher laudo
7. Enviar mensagens conforme necessário
8. Obter assinatura
9. Finalizar serviço

### Para Desenvolvimento
```jsx
// Importar hooks
import { useIndexedDB } from '@/hooks/useIndexedDB';
import { useSyncManager } from '@/hooks/useSyncManager';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';

// No componente
export default function MinhaOS() {
  const { isReady, saveFotoOffline, addToSyncQueue } = useIndexedDB();
  const { syncFotos } = useSyncManager();
  useBackgroundSync(osId);

  // Sua lógica
}
```

---

## Endpoints Esperados

### Ordens
- `GET /api/v1/ordens/?data_agendado=YYYY-MM-DD` - Ordens do dia
- `GET /api/v1/ordens/{id}/` - Detalhes da OS
- `PATCH /api/v1/ordens/{id}/` - Atualizar OS
  - Campos: `status`, `hora_inicio`, `hora_conclusao`, `laudo`, `assinatura_cliente`

### Fotos
- `POST /api/v1/ordens/{id}/fotos/` - Upload de foto
  - Form: `foto`, `tipo` (antes/depois)

### Chat
- `GET /api/v1/ordens/{id}/mensagens/` - Listar mensagens
- `POST /api/v1/ordens/{id}/mensagens/` - Enviar mensagem
  - Body: `{ conteudo }`

---

## Requisitos do Browser

- IndexedDB (todos os modernos)
- FileReader API
- Canvas API
- Geolocation (opcional para maps)
- Camera Permissions (para foto)

---

## Otimizações Implementadas

1. **Performance**:
   - Lazy loading de fotos
   - Compressão de imagens
   - Throttle de eventos

2. **UX**:
   - Feedback visual imediato
   - Estados offline/online claros
   - Retry automático

3. **Acessibilidade**:
   - Fontes grandes (≥16px)
   - Botões grandes (≥48px)
   - Alto contraste
   - Ícones + texto

4. **Segurança**:
   - Base64 local (não expõe arquivo)
   - Validação no envio
   - Sincronização ordenada

---

## Troubleshooting

### "Fotos não sincronizando"
- Verificar conexão online
- Limpar cache IndexedDB
- Verificar console.log de erros

### "Canvas não funciona"
- Verificar suporte IndexedDB
- Testar em dispositivo real
- Verificar permissões

### "Assinatura não aparece"
- Canvas pode precisar de polyfill
- Testar em navegador mais recente
- Verificar espaço em disco

---

## Próximos Passos Sugeridos

1. Integrar com Service Worker para PWA completo
2. Adicionar suporte a assinatura com stylus
3. QR code para rastreamento de entrega
4. Notificações push offline
5. Dashboard de sincronização
6. Exportar relatório em PDF
7. Integração com GPS para geolocalização automática
