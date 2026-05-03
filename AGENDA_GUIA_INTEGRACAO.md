# Guia de Integração - Agenda de Técnicos (C1)

## Pré-requisitos

### Backend
- Django REST Framework configurado
- Modelo de Ordem de Serviço com campos: `data_agendada`, `hora_inicio`, `hora_conclusao`, `tecnico_responsavel`
- Usuários com atributo `role` (tecnico, admin, gestor, etc.)
- Banco de dados migrado

### Frontend
- React com Ant Design
- dayjs para manipulação de datas
- Axios configurado para API
- Sistema de autenticação com token JWT

## Instalação de Dependências

```bash
# Backend (Django)
pip install djangorestframework
pip install python-dateutil

# Frontend (Node.js)
npm install antd dayjs dayjs-plugin-utc dayjs-plugin-timezone
```

## Configuração

### Backend

1. **Certificar que urls.py está configurado:**
```python
# erp_backend/urls.py
from django.urls import path, include

urlpatterns = [
    # ... outras URLs
    path('api/v1/ordens/', include('apps.ordens.urls')),
]
```

2. **Verificar que o OrdemServicoViewSet está registrado:**
```python
# apps/ordens/urls.py
from rest_framework.routers import DefaultRouter
from .views import OrdemServicoViewSet

router = DefaultRouter()
router.register("", OrdemServicoViewSet, basename="ordens")
urlpatterns = router.urls
```

3. **Executar migrações (se houver novas):**
```bash
python manage.py migrate
```

### Frontend

1. **Importar o serviço de agenda:**
```javascript
import agendaService from "@/services/agenda";
```

2. **Adicionar rotas:**
```javascript
// Exemplo com React Router
import AgendaPage from "@/pages/Agenda";
import MinhasOSHojePage from "@/pages/Agenda/MinhasOSHoje";

const routes = [
  {
    path: "/agenda",
    component: AgendaPage,
    name: "Agenda de Técnicos",
  },
  {
    path: "/minhas-os-hoje",
    component: MinhasOSHojePage,
    name: "Minhas OS Hoje",
  },
];
```

3. **Adicionar menu:**
```javascript
// Menu lateral ou principal
const menuItems = [
  {
    key: "agenda",
    icon: <CalendarOutlined />,
    label: "Agenda",
    onClick: () => navigate("/agenda"),
  },
  {
    key: "minhas-os",
    icon: <CheckCircleOutlined />,
    label: "Minhas OS Hoje",
    onClick: () => navigate("/minhas-os-hoje"),
  },
];
```

## Uso

### Para Administrador/Gestor

1. **Acessar `/agenda`**
2. **Escolher visualização:**
   - Mensal: calendário com overview
   - Semanal: grade horária por técnico
   - Hoje: lista simples de OS do dia

3. **Aplicar filtros:**
   - Por técnico
   - Por tipo de serviço
   - Por período (mensal/semanal)

4. **Reagendar:**
   - Clicar em uma OS
   - Modal abre para editar data/hora
   - Salvar (cria log automático)

### Para Técnico

1. **Acessar `/minhas-os-hoje`**
2. **Ver suas OS do dia:**
   - Status e horário
   - Endereço com ícone de localização
   - Descrição do serviço

3. **Ações rápidas:**
   - "Como chegar": Google Maps com endereço
   - "WhatsApp": Contato direto com cliente
   - "Email": Enviar email para cliente

4. **Auto-atualização:** Página atualiza a cada 30 segundos

## Estrutura de Diretórios

```
erp_frontend/
├── src/
│   ├── pages/
│   │   └── Agenda/
│   │       ├── index.jsx (Visão mensal/semanal/hoje)
│   │       └── MinhasOSHoje.jsx (Visão móvel para técnico)
│   └── services/
│       ├── agenda.js (Serviço de API)
│       └── ordemService.js (Serviço legado - deprecated)

erp_backend/
├── apps/
│   └── ordens/
│       ├── views.py (Endpoints: agenda, agenda/hoje, reagendar)
│       ├── serializers.py (AgendaSerializer, TecnicoAgendaSerializer)
│       ├── urls.py (Roteamento)
│       └── tests_agenda.py (Testes)
```

## API Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/ordens/agenda/` | Agenda por período agrupada por técnico |
| GET | `/api/v1/ordens/agenda/hoje/` | OS agendadas para hoje |
| PATCH | `/api/v1/ordens/{id}/reagendar/` | Reagendar uma OS |

## Filtros Disponíveis

### GET /api/v1/ordens/agenda/

- `data_inicio` (YYYY-MM-DD): Data de início
- `data_fim` (YYYY-MM-DD): Data de fim
- `tecnico` (ID): ID do técnico
- `tipo_servico`: Tipo de serviço (hvac, refrigeracao, eletrica, etc.)

### GET /api/v1/ordens/agenda/hoje/

- Sem parâmetros (filtro automático por usuário se for técnico)

## Permissões

- **Admin/Gestor**: Acesso total a todos os endpoints
- **Técnico**: 
  - Lê apenas suas OS em `/agenda/hoje/`
  - Lê todas as OS em `/agenda/` (sem restrição de filtro de técnico)
  - Pode reagendar suas próprias OS

## Tratamento de Erros

### Erro 404 - OS não encontrada
```json
{
  "detail": "Not found."
}
```

### Erro 400 - Dados inválidos
```json
{
  "data_agendada": ["Date has wrong format. Use one of these formats instead: YYYY-MM-DD"],
  "hora_inicio": ["Time has wrong format."]
}
```

### Erro 403 - Sem permissão
```json
{
  "detail": "Authentication credentials were not provided."
}
```

## Testes

### Rodar testes do backend
```bash
python manage.py test apps.ordens.tests_agenda
```

### Rodar teste específico
```bash
python manage.py test apps.ordens.tests_agenda.AgendaTecnicosTestCase.test_agenda_hoje_tecnico
```

## Performance

### Otimizações já implementadas

1. **Select Related**: 
   - cliente, contato_responsavel, endereco_servico
   - tecnico_responsavel, criado_por, atualizado_por

2. **Prefetch Related**:
   - itens, fotos, mensagens__anexos
   - despesas, logs_status

3. **Frontend**:
   - useMemo para cálculos de agrupamento
   - Lazy loading de componentes
   - Auto-atualização em intervalo configurável

## Sugestões de Melhoria

1. **Notificações em Tempo Real**
   - WebSocket para atualização automática
   - Push notification quando reagendado

2. **Drag and Drop**
   - Implementar drag-drop na visão semanal
   - Validar conflitos de horário

3. **Geolocalização**
   - Sugestão automática de rotas
   - Integração com GPS dos técnicos

4. **Relatórios**
   - Export de agenda em PDF
   - Integração com Google Calendar/Outlook

5. **Mobile App**
   - App nativo para iOS/Android
   - Funcionalidades offline

## Troubleshooting

### Problema: "404 Not Found" nos endpoints de agenda
**Solução**: Verificar que o arquivo `urls.py` está correto e o roteador está registrando o `OrdemServicoViewSet`

### Problema: "OS de técnico aparecem para outro técnico"
**Solução**: Verificar que o usuário tem `role="tecnico"` no banco de dados

### Problema: Datas aparecem com timezone incorreto
**Solução**: Verificar configuração de `USE_TZ` no Django settings

### Problema: Filtro de técnico não funciona
**Solução**: Usar parâmetro `tecnico` (não `tecnico_responsavel`)

## Logs de Teste

Para testar os endpoints via cURL:

```bash
# Agenda por período
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/ordens/agenda/?data_inicio=2025-04-01&data_fim=2025-04-30"

# Agenda de hoje
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/ordens/agenda/hoje/"

# Reagendar
curl -X PATCH -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data_agendada":"2025-04-20","hora_inicio":"14:30:00"}' \
  "http://localhost:8000/api/v1/ordens/101/reagendar/"
```

## Documentação Completa

- Backend: `apps/ordens/views.py`
- Frontend: `pages/Agenda/index.jsx` e `pages/Agenda/MinhasOSHoje.jsx`
- Serviço: `services/agenda.js`
- Exemplos: `AGENDA_EXEMPLOS_API.txt`
