# Guia de Setup - Tela Mobile do Técnico

## Pré-requisitos

- Node.js 16+
- npm ou yarn
- React 18+
- Ant Design 5+
- React Router 6+

---

## 1. Instalação

### Passo 1: Clonar/Atualizar Repositório
```bash
cd erp_frontend
npm install
```

### Passo 2: Importações Automáticas
Todos os arquivos já foram criados. Não requer instalações adicionais além do npm install.

---

## 2. Estrutura de Pastas

```
erp_frontend/src/
├── components/
│   ├── SignatureCanvas.jsx          (NEW)
│   └── SignatureCanvas.css          (NEW)
├── hooks/
│   ├── useIndexedDB.js              (NEW)
│   ├── useSyncManager.js            (NEW)
│   ├── useBackgroundSync.js         (NEW)
│   ├── useIsMobile.js               (existente)
│   └── useOffline.js                (existente)
├── pages/
│   └── TecnicoMobile/
│       ├── index.jsx                (atualizado)
│       ├── OSCampo.jsx              (atualizado)
│       ├── TecnicoMobile.css        (atualizado)
│       └── EXEMPLOS_USO.jsx         (NEW)
├── utils/
│   └── tecnicoMobileUtils.js        (NEW)
└── App.jsx                           (rotas já existem)
```

---

## 3. Configuração de Rotas (Já Configurado)

No `App.jsx`, as rotas já estão configuradas:

```jsx
<Route path="/tecnico-mobile" element={<TecnicoMobilePage />} />
<Route path="/tecnico-mobile/os-campo/:osId" element={<OSCampoPage />} />
```

Nada precisa ser alterado.

---

## 4. Testes Locais

### 4.1 Executar em Desenvolvimento
```bash
npm run dev
```

### 4.2 Acessar no Navegador
```
http://localhost:5173/tecnico-mobile
```

### 4.3 Testar no Mobile Real

#### iPhone
1. Descobrir IP local: `ipconfig getifaddr en0` (Mac)
2. Acessar: `http://<seu-ip>:5173/tecnico-mobile`
3. Adicionar à home (PWA)

#### Android
1. Descobrir IP local: `ipconfig` (Windows) / `hostname -I` (Linux)
2. Acessar: `http://<seu-ip>:5173/tecnico-mobile`
3. Menu > "Instalar app"

### 4.4 Simular Offline no DevTools

#### Chrome DevTools
1. F12 > Network
2. Throttling: "Offline"
3. Testar captura de foto e finalizar OS

#### Firefox DevTools
1. F12 > Storage > IndexedDB
2. Simular perda de conexão manualmente

---

## 5. Verificar IndexedDB

### Chrome DevTools
1. Abrir DevTools (F12)
2. Ir para "Application"
3. Expandir "IndexedDB"
4. Procurar por "erp_tecnico_mobile"
5. Ver stores: offline_fotos, sync_queue, os_cache

### Firefox DevTools
1. Abrir DevTools (F12)
2. Ir para "Storage"
3. Expandir "Indexed DB"
4. Procurar por "erp_tecnico_mobile"

---

## 6. Build para Produção

### Build
```bash
npm run build
```

### Verificar Bundle Size
```bash
npm run build -- --report
```

### Servir Localmente
```bash
npm run preview
```

---

## 7. Configuração de PWA (Opcional)

Para melhorar o suporte PWA, adicione ao `vite.config.js`:

```javascript
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      manifest: {
        name: 'ERP - Técnico Mobile',
        short_name: 'Técnico',
        start_url: '/tecnico-mobile',
        display: 'standalone',
        theme_color: '#1B4F8A',
        background_color: '#ffffff',
        orientation: 'portrait-primary'
      }
    })
  ]
}
```

---

## 8. Service Worker (Opcional)

Se quiser adicionar Service Worker, crie `/src/sw.js`:

```javascript
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/tecnico-mobile',
        '/offline.html'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
```

Registre em `main.jsx`:
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

---

## 9. Variáveis de Ambiente

Se necessário, adicione ao `.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_TIMEOUT_SYNC=30000
VITE_MAX_RETRIES=3
VITE_MAX_IMAGE_SIZE=1024
VITE_IMAGE_QUALITY=0.8
```

Use em `useIndexedDB.js`:
```javascript
const TIMEOUT = import.meta.env.VITE_TIMEOUT_SYNC || 30000;
```

---

## 10. Troubleshooting

### IndexedDB não funciona
**Solução**: Ativar IndexedDB em:
- Chrome: Settings > Privacy > Cookies and other site data
- Firefox: Preferências > Privacidade > Histórico
- Safari: Settings > Privacy > Block all cookies (off)

### Câmera não funciona
**Solução**: 
- HTTPS é necessário em produção
- Verificar permissão do browser
- Testar em dispositivo real

### Fotos não sincronizam
**Solução**:
1. Verificar conexão online
2. Checar DevTools > Network
3. Verificar console.log
4. Limpar IndexedDB

### Canvas de assinatura não responde
**Solução**:
- Testar em navegador mais recente
- Verificar suporte Canvas (caniuse.com)
- Checar resolução da tela

---

## 11. Monitoramento

### Logs Recomendados

No `useSyncManager.js`, adicione logging:

```javascript
console.log('[Sync] Iniciando sincronização...');
console.log('[Sync] Fotos não sincronizadas:', unsyncedFotos.length);
console.log('[Sync] Ações pendentes:', unsyncedItems.length);
console.log('[Sync] Sincronização concluída');
```

### Sentry (Opcional)

Para rastreamento de erros em produção:

```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "seu-dsn-aqui",
  environment: "production",
});
```

---

## 12. Performance

### Otimizações Já Implementadas
- [x] Lazy loading de fotos
- [x] Compressão de imagens (1024x1024, 0.8 quality)
- [x] IndexedDB em vez de localStorage
- [x] Background sync (não bloqueia UI)
- [x] Debounce de atualização (30s)

### Melhorias Futuras
- [ ] Code splitting para OSCampo
- [ ] Virtual scrolling para chat
- [ ] Web Workers para compressão
- [ ] Compression API para IndexedDB

---

## 13. Segurança

### Checklist
- [x] Validação de entrada (laudo max 2000)
- [x] HTTPS em produção (obrigatório)
- [x] Permissões de câmera verificadas
- [x] Rate limiting (backend)
- [x] Token JWT no header (existente)

### Recomendações
1. Implementar CORS corretamente
2. Rate limit no backend (5 req/min por endpoint)
3. Validar assinatura no servidor
4. Criptografar dados sensíveis em trânsito

---

## 14. Endpoints Backend Necessários

### CRUD de Ordens
```
GET    /api/v1/ordens/?data_agendado=2025-05-02
GET    /api/v1/ordens/{id}/
PATCH  /api/v1/ordens/{id}/
```

### Fotos
```
POST   /api/v1/ordens/{id}/fotos/
GET    /api/v1/ordens/{id}/fotos/
```

### Mensagens
```
GET    /api/v1/ordens/{id}/mensagens/
POST   /api/v1/ordens/{id}/mensagens/
```

---

## 15. Deploy

### Vercel
```bash
vercel deploy --prod
```

### Netlify
```bash
netlify deploy --prod --dir=dist
```

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

---

## 16. Suporte

Para issues/dúvidas, consulte:
1. `TECNICO_MOBILE_IMPLEMENTACAO.md` - Documentação completa
2. `EXEMPLOS_USO.jsx` - Exemplos de código
3. `CHECKLIST_TECNICO_MOBILE.md` - Verificação de funcionalidades

---

**Setup Completo!**

Agora você pode:
1. `npm run dev` para desenvolvimento
2. Testar em mobile real
3. Verificar offline mode
4. Fazer build para produção
