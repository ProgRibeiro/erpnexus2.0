# 🚀 ERP Nexus — Quick Start

## Pré-requisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

---

## 1️⃣ Setup Backend (Django)

```bash
cd erp_backend

# Criar virtual environment (se não existir)
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# ou
venv\Scripts\activate     # Windows

# Instalar dependências
pip install -r requirements.txt

# Aplicar migrations
python3 manage.py migrate

# (Opcional) Carregar dados iniciais
python3 manage.py loaddata erp_backend/apps/crm/fixtures/pipeline_inicial.json

# Rodar servidor
python3 manage.py runserver 127.0.0.1:8000
```

**Resultado esperado**: 
```
Starting development server at http://127.0.0.1:8000/
```

---

## 2️⃣ Setup Frontend (React + Vite)

Em OUTRO terminal:

```bash
cd erp_frontend

# Instalar dependências
npm install

# Rodar em desenvolvimento (com hot reload)
npm run dev
```

**Resultado esperado**:
```
VITE v6.4.2 ready in 1234 ms

➜  Local:   http://127.0.0.1:5173/
```

---

## 3️⃣ Acessar o Sistema

- **URL**: http://127.0.0.1:5173/ (desenvolvimento com Vite)
- **Ou**: http://127.0.0.1:8000/ (produção com build estático)
- **Login**: `admin@admin.com`
- **Senha**: `admin123`

---

## ✨ Testar Novos Recursos

### Command Palette (Cmd+K / Ctrl+K)
1. Qualquer página → Press `Cmd+K` (Mac) ou `Ctrl+K` (Windows)
2. Digite o que procura: "ordem", "financeiro", "novo"
3. Selecione e pressione Enter

### Atalhos de Teclado
| Atalho | Ação |
|--------|------|
| `Alt+O` | Ir para Ordens |
| `Alt+F` | Ir para Financeiro |
| `Ctrl+Alt+O` | Nova Ordem |
| `Ctrl+/` | Ver todos os atalhos |

### Integrações (no Console)
```javascript
// Abrir console: F12 ou Cmd+Option+J

// 1. Testar health check
const health = await integrationsService.health.checkBackendHealth()
console.log('Backend ok?', health)

// 2. Listar todos os comandos
console.log(COMMANDS)

// 3. Gerar relatório de atalhos
printShortcuts()

// 4. Testar cache
integrationsService.cache.set('teste', { dados: 'xyz' }, 60000)
console.log(integrationsService.cache.get('teste'))

// 5. Testar webhooks
webhookService.subscribe('test', (data) => console.log('Event:', data))
webhookService.emit('test', { mensagem: 'Funciona!' })
```

---

## 🔧 Troubleshooting

### Erro: "ModuleNotFoundError: No module named 'django'"
```bash
# Verificar se venv está ativado
source venv/bin/activate

# Instalar novamente
pip install django djangorestframework django-cors-headers
```

### Erro: "psycopg2" não encontrado
```bash
# Instalar dependência de PostgreSQL
pip install psycopg2-binary
```

### Porta 8000 / 5173 já em uso
```bash
# Mudar porta
python3 manage.py runserver 127.0.0.1:8001
npm run dev -- --port 5174
```

### Frontend não carrega no Django
```bash
cd erp_frontend
npm run build  # Gera dist em ../erp_backend/frontend_dist/
```

---

## 📊 Estrutura do Projeto

```
erpnexus2.0/
├── erp_backend/           # Django REST API
│   ├── manage.py
│   ├── requirements.txt
│   ├── apps/              # Apps Django (ordens, financeiro, etc)
│   └── frontend_dist/     # Build estático do frontend
├── erp_frontend/          # React + Vite
│   ├── src/
│   │   ├── services/      # Serviços (integrações, comandos)
│   │   ├── components/    # Componentes (CommandPalette, etc)
│   │   ├── pages/         # Páginas
│   │   └── App.jsx        # Router principal
│   ├── package.json
│   └── vite.config.js
├── COMMANDS_SHORTCUTS.md  # 📖 Guia completo de atalhos
└── QUICK_START.md         # Este arquivo
```

---

## 🎯 Próximas Steps Opcionais

1. **Adicionar mais comandos**: Edite `erp_frontend/src/services/commandPaletteService.js`
2. **Criar mais atalhos**: Edite `erp_frontend/src/services/keyboardService.js`
3. **Usar integrações**: Importe `integrationsService` onde precisar
4. **Customizar cores**: Edite `erp_frontend/src/styles/theme.js`

---

## 📞 Help

```bash
# Ver logs completos do build
npm run build  # Frontend
python3 manage.py runserver --verbosity=3  # Backend

# Verificar saúde do sistema (no console)
integrationsService.health.startHeartbeat()
```

Aproveite! 🚀
