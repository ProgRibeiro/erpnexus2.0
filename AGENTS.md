# ERP Nexus — Memória do Agente (Atualizado)

> Este arquivo é a memória permanente do projeto. Todo agente de IA deve lê-lo antes de qualquer trabalho.
> Mantém contexto completo independente de qual ferramenta de IA está sendo usada.

---

## Identidade do projeto

**Nome**: ERP Nexus
**Propósito**: ERP web completo para empresa de serviços (HVAC, refrigeração, elétrica, civil)
**Ambiente**: Execução 100% local (Windows). Sem deploy em cloud.
**Repositório**: C:\Users\lucas\Documents\ERP NOVO EM PRODUÇÃO

---

## Stack técnica

| Camada              | Tecnologia                                                      |
| ------------------- | --------------------------------------------------------------- |
| Backend             | Python 3.11 + Django 5 + Django REST Framework                  |
| Frontend            | React 18 + Ant Design 5 + Vite                                  |
| Banco de dados      | PostgreSQL 15                                                   |
| Autenticação        | JWT via `djangorestframework-simplejwt`                         |
| Tarefas assíncronas | Celery + Redis                                                  |
| Upload de arquivos  | django-storages (local filesystem)                              |
| PDF                 | ReportLab (WeasyPrint NÃO funciona no Windows — sem libgobject) |
| Gráficos            | Recharts                                                        |

---

## Como executar localmente

```bash
# Backend (Django)
cd erp_backend
python manage.py runserver 127.0.0.1:8000

# Alternativa recomendada no Windows
iniciar-backend-seguro.bat

# Frontend (Vite dev)
cd erp_frontend
npm run dev    # → http://127.0.0.1:5173/

# Build do frontend (gera dist para Django servir)
cd erp_frontend
npm run build  # saída em erp_backend/frontend_dist/
```

O Django serve o frontend compilado a partir de `erp_backend/frontend_dist/`.
Em dev, usar o Vite direto em 5173 com proxy para o Django em 8000.

---

## Credenciais de acesso

- **URL**: http://127.0.0.1:8000 (ou :5173 em dev)
- **Login admin**: `admin@admin.com`
- **Senha**: `admin123`
- **Banco PostgreSQL**: usuário/senha configurados em `erp_backend/settings.py`

---

## Backup e segurança local

### Backup ativo

- Backup manual do banco e da pasta `media`: `backup_banco.bat`
- Comando Django equivalente: `cd erp_backend && python manage.py backup_sistema`
- Pasta padrão fora do repositório: `C:\ERP_BACKUPS\ERP_NEXUS`
- Retenção padrão: 30 dias (`ERP_BACKUP_RETENTION_DAYS=30`)
- O backup gera:
  - `.dump` do PostgreSQL em formato customizado (`pg_dump --format=custom`)
  - `.zip` da pasta `media`
  - manifesto `.txt` com dados do backup e instrução de restauração

### Agendamento no Windows

- Para ativar backup diário às 02:00, executar como administrador:

```bash
agendar_backup_diario.bat
```

### Restauração

- Restaurar exige confirmação explícita para evitar perda acidental:

```bash
restaurar_backup.bat "C:\ERP_BACKUPS\ERP_NEXUS\erp_db_YYYYMMDD_HHMMSS.dump"
```

ou:

```bash
cd erp_backend
python manage.py restaurar_backup --arquivo "C:\ERP_BACKUPS\ERP_NEXUS\erp_db_YYYYMMDD_HHMMSS.dump" --confirmar
```

### Proteções ativas no Django

- JWT com rotação e blacklist de refresh token.
- Rate limit básico: anônimo `20/min`, usuário `200/min`.
- Headers: `X_FRAME_OPTIONS=DENY`, `SECURE_CONTENT_TYPE_NOSNIFF=True`, `SECURE_REFERRER_POLICY=same-origin`.
- Cookies de sessão com `HttpOnly` e `SameSite=Lax`.
- Variáveis prontas para modo seguro: `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_HSTS_SECONDS`.
- Auditoria local: `verificar_seguranca.bat` ou `cd erp_backend && python manage.py verificar_seguranca`.
- Bloqueio de portas externas do ERP no Windows: `bloquear_acesso_externo.bat`.
- Remoção do bloqueio, somente se for necessário acesso em rede local: `desbloquear_acesso_externo.bat`.

### Importante

- Ambiente local de teste pode usar `DEBUG=True`.
- Rodar o backend preso em `127.0.0.1:8000`, não em `0.0.0.0`, salvo necessidade explícita.
- Se o sistema for exposto na rede/internet ou usado com dados reais, usar `DEBUG=False`, restringir `DJANGO_ALLOWED_HOSTS`, ativar HTTPS, executar o backup diário e manter o firewall bloqueando portas externas.

### Regra fixa de ambiente local

- **Nunca alterar o login ou a senha padrão de teste** sem pedido explícito do Lucas.
- Credencial oficial do ambiente local: `admin@admin.com` / `admin123`.
- Em ambiente local, `localhost` e `127.0.0.1` devem apontar para o tenant `demo_erp`, não para `public`.
- Se o acesso falhar após migrations, seeds ou mudanças de tenant, restaurar com:

```bash
cd erp_backend
python manage.py configurar_ambiente_local
python manage.py garantir_admin_teste
```

---

## Fases concluídas

| Fase | Descrição                                                                      | Status |
| ---- | ------------------------------------------------------------------------------ | ------ |
| 1    | Usuários, JWT, autenticação frontend, Git                                      | ✅     |
| 2    | Módulo clientes e módulo ordens (base)                                         | ✅     |
| 3    | CRM Kanban estilo Trello                                                       | ✅     |
| 4    | Módulo financeiro (lançamentos, dashboard)                                     | ✅     |
| 5    | Módulo estoque                                                                 | ✅     |
| 6    | Complementos: portal do cliente, notificações push                             | ✅     |
| 7    | PWA mobile (manifest, service worker, modo offline, técnico campo)             | ✅     |
| 8    | Redesign visual completo (Ant Design 5, tema moderno, layouts)                 | ✅     |
| 9    | Geração de PDF via ReportLab, templates, botões no frontend                    | ✅     |
| 10   | Deploy removido do escopo — projeto roda apenas localmente                     | ✅     |
| 11   | Dashboard principal (métricas, gráfico Recharts, OS do dia, tabelas)           | ✅     |
| 12   | Listagem de Ordens de Serviço (filtros, tabela, navegação)                     | ✅     |
| 13   | Telas de Orçamentos (listagem, novo, detalhe, conversão para OS)               | ✅     |
| 14   | Rebrand para ERP Nexus, correção de configuração da empresa, correção de cores | ✅     |
| SaaS | Plataforma multi-tenant enterprise — Tenant, Empresa, Unidade, Budget, Aprovação por Alçada, Portal Contratante, BI, Auditoria, Mobile swipe, SLA Celery | ✅ |
| Contratos | Módulo completo de manutenção preventiva multi-loja com checklists ABNT, geração automática de OS, faturas mensais recorrentes e PDFs profissionais | ✅ |

---

## Módulos do backend (`erp_backend/apps/`)

| App            | Descrição                                                   | Migrations |
| -------------- | ----------------------------------------------------------- | ---------- |
| `usuarios`     | Usuário customizado, perfis, JWT                            | Concluídas |
| `clientes`     | Cadastro de clientes e contatos                             | Concluídas |
| `ordens`       | Coração do sistema — OS completa com itens, PC, fotos, chat | Até `0007` |
| `financeiro`   | Lançamentos, categorias, dashboard, receitas automáticas    | Concluídas |
| `crm`          | Pipeline, colunas, oportunidades (Kanban)                   | Concluídas |
| `estoque`      | Produtos, movimentações                                     | Concluídas |
| `relatorios`   | Geração de PDF via ReportLab                                | Concluídas |
| `fiscal`       | Consulta CNPJ (BrasilAPI) + cálculo de impostos             | Concluídas |
| `notificacoes` | Push notifications (portal do cliente)                      | Concluídas |
| `saas`         | Multi-tenant: Tenant, Empresa, Unidade, Budget, Aprovação, SLA, Auditoria | Concluídas |
| `portal_contratante` | Portal Facilities: dashboard, chamados, BI, aprovações, relatórios | Concluídas |
| `contratos`    | Contratos de preventiva multi-loja, checklists, OS automáticas, faturas e PDFs | Concluídas |

---

## Endpoints da API (prefixo `/api/v1/`)

```
GET/POST  /api/v1/ordens/                  # listagem e criação de OS
GET/PATCH /api/v1/ordens/{id}/             # detalhe e edição
POST      /api/v1/ordens/{id}/mudar-status/  # mover etapa
POST      /api/v1/ordens/{id}/analisar-pc/ # leitura inteligente de PDF do PC
POST      /api/v1/ordens/{id}/fotos/       # upload de fotos
POST      /api/v1/ordens/{id}/mensagens/   # chat interno
POST      /api/v1/ordens/{id}/confirmar-faturamento/  # gera lançamento no financeiro
GET       /api/v1/ordens/agenda/hoje/      # OS agendadas para hoje
GET       /api/v1/clientes/                # listagem de clientes
GET/POST  /api/v1/financeiro/lancamentos/  # lançamentos financeiros
GET       /api/v1/financeiro/dashboard/    # métricas do financeiro
GET       /api/v1/auth/users/              # usuários (técnicos filtrar por role)
GET       /api/v1/crm/pipelines/           # pipelines do CRM
GET/POST  /api/v1/crm/oportunidades/       # cards do Kanban
POST      /api/v1/fiscal/consultar-cnpj/   # BrasilAPI
POST      /api/v1/fiscal/calcular-impostos/

# Facilities SaaS
GET       /api/v1/portal/contratante/dashboard/   # dashboard do contratante
GET/POST  /api/v1/portal/contratante/chamados/    # chamados da plataforma
GET       /api/v1/portal/contratante/budget/      # budget e centros de custo
GET       /api/v1/portal/contratante/aprovacoes-pendentes/
POST      /api/v1/portal/contratante/aprovacoes/{id}/aprovar/
POST      /api/v1/portal/contratante/aprovacoes/{id}/reprovar/
GET       /api/v1/portal/contratante/bi/visao-geral/
GET       /api/v1/portal/contratante/bi/evolucao/
GET       /api/v1/portal/contratante/bi/heatmap-unidades/
GET       /api/v1/portal/contratante/bi/curva-abc-prestadores/
GET       /api/v1/portal/contratante/bi/comparativo-regionais/
GET       /api/v1/portal/contratante/relatorios/auditoria/

# SaaS Config (Configurações do Facilities)
GET/POST  /api/v1/saas/tenants/
GET/POST  /api/v1/saas/empresas/
GET/POST  /api/v1/saas/unidades/
GET/POST  /api/v1/saas/niveis-aprovacao/
GET/POST  /api/v1/saas/centros-custo/
GET/POST  /api/v1/saas/prestadores-contratados/
GET/POST  /api/v1/saas/categorias-budget/
GET/POST  /api/v1/saas/contratos/
GET       /api/v1/saas/planos/

# Mobile Facilities
GET       /api/v1/mobile/aprovacoes-pendentes/
POST      /api/v1/mobile/aprovacao/{id}/swipe-aprovar/
POST      /api/v1/mobile/aprovacao/{id}/swipe-reprovar/
GET       /api/v1/mobile/dashboard-executivo/

# Contratos Preventiva
GET       /api/v1/contratos/escopos/
GET       /api/v1/contratos/escopos/{id}/checklist-padrao/
GET/POST  /api/v1/contratos/
GET/PATCH /api/v1/contratos/{id}/
POST      /api/v1/contratos/{id}/unidades/
PATCH     /api/v1/contratos/{id}/unidades/{uid}/
DELETE    /api/v1/contratos/{id}/unidades/{uid}/
POST      /api/v1/contratos/{id}/escopos-unidade/
POST      /api/v1/contratos/{id}/calcular-totais/
POST      /api/v1/contratos/{id}/ativar/
POST      /api/v1/contratos/{id}/gerar-pdf-contrato/
POST      /api/v1/contratos/{id}/gerar-pdf-proposta/
POST      /api/v1/contratos/{id}/gerar-pdf-cronograma/
GET       /api/v1/contratos/{id}/cronograma/
GET       /api/v1/contratos/{id}/faturas/
POST      /api/v1/contratos/{id}/gerar-fatura-mes/
POST      /api/v1/contratos/{id}/rescindir/
```

---

## Rotas do frontend (`erp_frontend/src/`)

```
/                  → DashboardPage.jsx (dashboard principal)
/ordens            → OrdensPage.jsx (listagem)
/ordens/novo       → NovaOS.jsx (redireciona para /ordens por ora)
/ordens/:id        → OSDetalhe.jsx (coração — 1788 linhas)
/orcamentos        → OrcamentosPage.jsx
/orcamentos/novo   → NovoOrcamento.jsx
/orcamentos/:id    → OrcamentoDetalhe.jsx
/orcamentos/:id/impressao → ImpressaoOrcamento.jsx
/contratos         → ContratosPage.jsx
/contratos/novo    → NovoContrato.jsx
/contratos/:id     → ContratoDetalhe.jsx
/financeiro        → Dashboard financeiro
/financeiro/lancamentos → Lancamentos.jsx
/crm               → CRM Kanban (index.jsx)
/clientes          → ClientesPage.jsx
/estoque           → index.jsx
/servicos          → index.jsx
/fiscal            → index.jsx
/configuracoes     → index.jsx
/tecnico           → TecnicoMobile (PWA)
/login             → LoginPage.jsx
```

---

## Sistema de design (Ant Design 5)

**Arquivo do tema**: `erp_frontend/src/styles/theme.js`
**CSS global**: `erp_frontend/src/styles/global.css`
**ConfigProvider**: aplicado em `src/main.jsx`

### Cores principais (NÃO usar #1B4F8A — cor antiga e descontinuada)

| Token           | Valor     | Uso                            |
| --------------- | --------- | ------------------------------ |
| `colorPrimary`  | `#3B82F6` | Botões, links, ações primárias |
| `colorSuccess`  | `#10B981` | Confirmações, status OK        |
| `colorWarning`  | `#F59E0B` | Alertas, pendente              |
| `colorError`    | `#EF4444` | Erros, cancelamentos           |
| `colorBgLayout` | `#F8FAFC` | Fundo da página                |
| sidebar bg      | `#111827` | Menu lateral                   |
| header bg       | `#FFFFFF` | Topbar                         |

### Importante

- **Nunca use `#1B4F8A`** — foi substituído por `#3B82F6` em todo o projeto
- Botões primários usam `type="primary"` sem inline style, ou inline com `background: "#3B82F6"`
- Border-radius padrão: 10px (cards 14px)
- Fonte: Inter

---

## Arquivos críticos para não sobrescrever sem avisar

| Arquivo                                       | Por quê é crítico                                     |
| --------------------------------------------- | ----------------------------------------------------- |
| `erp_frontend/src/pages/Ordens/OSDetalhe.jsx` | 1788 linhas — coração da OS, muito trabalho acumulado |
| `erp_frontend/src/styles/theme.js`            | Define todo o design system                           |
| `erp_frontend/src/styles/global.css`          | CSS global — sidebar, header, badges                  |
| `erp_backend/apps/ordens/models.py`           | Model principal com campos PC, fiscal, fotos          |
| `erp_backend/apps/ordens/views.py`            | Endpoints críticos: PC analysis, faturamento, chat    |
| `erp_backend/apps/fiscal/services.py`         | Consulta CNPJ e cálculo de impostos                   |
| `erp_frontend/src/layouts/Sidebar.jsx`        | Menu de navegação principal                           |
| `erp_frontend/src/App.jsx`                    | Todas as rotas do sistema                             |

---

## Funcionalidades especiais implementadas

### Leitura inteligente de Pedido de Compra (PC)

- Upload de PDF do cliente → endpoint `/api/v1/ordens/{id}/analisar-pc/`
- PyPDF2 extrai número, valor, validade, itens por heurística
- Resultado salvo em `dados_pc_extraidos` (JSONField)
- Frontend mostra sugestões e permite aplicar à OS
- Exemplos confirmados são salvos para melhorar sugestões futuras

### Módulo fiscal

- `ConsultaCNPJ` usa BrasilAPI (gratuita, sem API key)
- `CalculadoraImpostos` suporta: MEI, Simples Nacional, Lucro Presumido, Lucro Real
- Resultado salvo em `dados_impostos` e `total_com_impostos` na OS

### CRM Pipeline

- Fixture inicial em `erp_backend/apps/crm/fixtures/pipeline_inicial.json`
- Pipeline "Comercial" com 6 colunas: Novo Lead → Ganho/Perdido
- Carregar: `python erp_backend/manage.py loaddata erp_backend/apps/crm/fixtures/pipeline_inicial.json`

### PWA / Técnico Mobile

- Service worker registrado em `erp_frontend/public/sw.js`
- Rota `/tecnico` tem UI mobile-first para técnico em campo
- Modo offline funcional com cache de OS do dia

---

## Limitações conhecidas

| Limitação                          | Causa                                    | Solução atual                                                                                          |
| ---------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| WeasyPrint não funciona no Windows | Falta libgobject (biblioteca C nativa)   | ReportLab é usado automaticamente como fallback                                                        |
| Cache do service worker            | SW cacheia bundles antigos               | Ctrl+Shift+R ou `navigator.serviceWorker.getRegistrations().then(r => r.forEach(r => r.unregister()))` |
| Técnicos via API                   | `/api/v1/usuarios/` não existe           | Usar `/api/v1/auth/users/` e filtrar `role === "tecnico"` no frontend                                  |
| Upload com logo                    | Deve ser `multipart/form-data`, não JSON | Já corrigido em `configuracoes/views.py`                                                               |
| Chunk size warning no build        | Bundle único grande (Recharts + Antd)    | Aviso cosmético, não é erro                                                                            |

---

## Regras obrigatórias para todos os agentes

1. **Responda sempre em português brasileiro**
2. **Crie arquivos diretamente no projeto** — nunca só mostre código
3. **Confirme o caminho de cada arquivo criado/alterado**
4. **Nunca sobrescreva arquivos existentes sem avisar**
5. **Sempre rode migrations após criar ou alterar models** (`python manage.py makemigrations && migrate`)
6. **Sempre faça commit após concluir cada fase** com mensagem "Fase X: descrição"
7. **Nunca use "..." ou "resto do código aqui"** — código sempre completo
8. **Não use `#1B4F8A`** — cor antiga. Use `#3B82F6` para azul primário
9. **Não crie arquivos markdown de planejamento** no repositório — use memória do agente
10. **Todas as rotas da API** no prefixo `/api/v1/`

---

## Padrão de commits

```
Fase X: descrição curta do que foi feito

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```
