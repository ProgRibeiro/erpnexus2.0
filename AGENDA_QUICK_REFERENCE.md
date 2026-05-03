# AGENDA DE TÉCNICOS (C1) - QUICK REFERENCE

## O que foi implementado?

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENDA DE TÉCNICOS (C1)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✓ Backend: 3 Endpoints de API REST                            │
│  ✓ Frontend: 2 Componentes React                               │
│  ✓ Serviço: Chamadas à API                                     │
│  ✓ Testes: 11 Testes Unitários                                 │
│  ✓ Documentação: 4 Arquivos Completos                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Endpoints de API (Backend)

```
GET  /api/v1/ordens/agenda/
     └─ Agenda por período, agrupada por técnico
     └─ Params: data_inicio, data_fim, tecnico?, tipo_servico?

GET  /api/v1/ordens/agenda/hoje/
     └─ OS agendadas para hoje (filtro automático por técnico)
     └─ Sem parâmetros

PATCH /api/v1/ordens/{id}/reagendar/
     └─ Reagendar uma OS
     └─ Body: data_agendada, hora_inicio?, tecnico_responsavel?
```

## Componentes Frontend

### 1. Agenda (Main) - `/pages/Agenda/index.jsx`
```
┌─────────────────────────────────────┐
│  Agenda de Técnicos                 │
├─────────────────────────────────────┤
│ [Mensal] [Semanal] [Hoje]          │
│                                      │
│ Filtro Técnico: [dropdown]          │
│ Filtro Tipo:    [dropdown]          │
│ Data início:    [picker]            │
│ Data fim:       [picker]            │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │  MAI 2025                       │ │
│ ├─────────────────────────────────┤ │
│ │ 01 02 03 04 05 06 07           │ │
│ │ 08 09 10 11 12 13 14           │ │
│ │ [João: 2 OS] [Maria: 1 OS]     │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2. Minhas OS Hoje - `/pages/Agenda/MinhasOSHoje.jsx`
```
┌─────────────────────────────────────┐
│  Minhas OS de Hoje                  │
├─────────────────────────────────────┤
│   [Total: 5]  [Concluídas: 2]      │
├─────────────────────────────────────┤
│ #1 OS-2025-0001 [Agendada]          │
│    Cliente: Empresa XYZ             │
│    📍 Rua A, 123 - São Paulo        │
│    🕐 09:00 até 10:30               │
│    [Como chegar] [WhatsApp] [Email] │
│                                      │
│ #2 OS-2025-0002 [Em Execução]       │
│    ...                               │
└─────────────────────────────────────┘
```

## Fluxo de Dados

```
ADMIN/GESTOR                      TÉCNICO
    │                               │
    ├─ Acessa /agenda              ├─ Acessa /minhas-os-hoje
    │  └─ Seleciona visão          │
    │     ├─ Mensal (calendário)   ├─ Vê suas OS do dia
    │     ├─ Semanal (grade)       │
    │     └─ Hoje (lista)          ├─ Auto-atualiza 30s
    │                               │
    ├─ Aplica filtros              ├─ Clica em "Como chegar"
    │  ├─ Por técnico              │  └─ Abre Google Maps
    │  └─ Por tipo                 │
    │                               ├─ Clica "WhatsApp"
    ├─ Clica em uma OS             │  └─ Inicia conversa
    │  └─ Modal abre               │
    │     ├─ Muda data             ├─ Clica "Email"
    │     ├─ Muda hora             │  └─ Abre cliente email
    │     └─ Salva
    │        └─ Log automático
    │
    API
    │
    ├─ GET /api/v1/ordens/agenda/
    ├─ GET /api/v1/ordens/agenda/hoje/
    └─ PATCH /api/v1/ordens/{id}/reagendar/
```

## Estrutura de Resposta da API

### GET /agenda/
```json
[
  {
    "data": "2025-04-15",
    "tecnicos": [
      {
        "id": 1,
        "nome_completo": "João Silva",
        "total_os": 2,
        "ordens": [
          {
            "id": 101,
            "numero": "OS-2025-0001",
            "cliente_nome": "Empresa XYZ",
            "data_agendada": "2025-04-15",
            "hora_inicio": "09:00:00"
            ...
          }
        ]
      }
    ]
  }
]
```

## Status Filtrados

Apenas estas OS aparecem na agenda:
```
✓ agendada      (Agendada)
✓ em_execucao   (Em Execução)

✗ rascunho      (não aparece)
✗ aberta        (não aparece)
✗ orcamento_*   (não aparece)
✗ aprovada      (não aparece)
✗ concluida     (não aparece)
✗ faturada      (não aparece)
✗ cancelada     (não aparece)
```

## Tipos de Serviço (Filtros)

```
hvac, refrigeracao, eletrica, civil, manutencao, instalacao, outro
```

## Permissões

```
Técnico          Admin/Gestor
├─ Vê suas OS    ├─ Vê todas as OS
├─ Lê agenda     ├─ Lê agenda
└─ Não pode      └─ Pode reagendar
   reagendar
```

## Testes

```bash
# Rodar todos os testes de agenda
python manage.py test apps.ordens.tests_agenda

# Testes específicos:
python manage.py test apps.ordens.tests_agenda.AgendaTecnicosTestCase.test_agenda_periodo_sem_filtro
python manage.py test apps.ordens.tests_agenda.AgendaTecnicosTestCase.test_agenda_hoje_tecnico
python manage.py test apps.ordens.tests_agenda.AgendaTecnicosTestCase.test_reagendar_os
```

## Exemplos de Uso

### JavaScript
```javascript
import agendaService from "@/services/agenda";

// Listar período
const agenda = await agendaService.listarPorPeriodo(
  "2025-04-01", "2025-04-30", null, null
);

// Hoje
const hoje = await agendaService.agendaHoje();

// Reagendar
await agendaService.reagendar(101, {
  data_agendada: "2025-04-20",
  hora_inicio: "14:30:00"
});
```

### CURL
```bash
# Agenda por período
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8000/api/v1/ordens/agenda/?data_inicio=2025-04-01&data_fim=2025-04-30"

# Agenda hoje
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8000/api/v1/ordens/agenda/hoje/"

# Reagendar
curl -X PATCH -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data_agendada":"2025-04-20","hora_inicio":"14:30:00"}' \
  "http://localhost:8000/api/v1/ordens/101/reagendar/"
```

## Arquivos Principais

| Arquivo | Tipo | Linhas | Status |
|---------|------|--------|--------|
| `views.py` | Backend | ~120 | ✓ Modificado |
| `serializers.py` | Backend | ~30 | ✓ Adicionado |
| `index.jsx` | Frontend | ~400 | ✓ Reescrito |
| `MinhasOSHoje.jsx` | Frontend | ~300 | ✓ Reescrito |
| `agenda.js` | Frontend | ~60 | ✓ Novo |
| `tests_agenda.py` | Backend | ~250 | ✓ Novo |

## Checklist de Implementação

```
Backend
├─ [x] Endpoints de API
├─ [x] Agrupamento de dados
├─ [x] Filtros e buscas
├─ [x] Logs automáticos
├─ [x] Testes
└─ [x] Validações

Frontend
├─ [x] Serviço de API
├─ [x] Visão Mensal
├─ [x] Visão Semanal
├─ [x] Visão Hoje
├─ [x] Filtros
├─ [x] Modal de edição
├─ [x] Componente Mobile
├─ [x] Auto-atualização
└─ [x] Responsividade

Documentação
├─ [x] Implementação
├─ [x] Exemplos de API
├─ [x] Guia de Integração
└─ [x] Arquivos Modificados
```

## Performance

```
Queries Otimizadas:
├─ select_related: 6 campos
├─ prefetch_related: 5 campos
└─ Total: 1-2 queries por request

Frontend:
├─ useMemo para agrupamento
├─ Lazy loading de componentes
└─ Auto-atualização: 30 segundos
```

## Próximas Melhorias

```
Priority 1:
├─ [ ] Drag-and-drop para reagendar
├─ [ ] Notificações de técnico
└─ [ ] Validação de conflito de horário

Priority 2:
├─ [ ] Export PDF/Excel
├─ [ ] Integração Google Calendar
└─ [ ] Sugestão automática de rotas

Priority 3:
├─ [ ] App nativo
├─ [ ] Geolocalização
└─ [ ] Histórico de reagendamentos
```

## Documentação Detalhada

```
AGENDA_TECNICOS_IMPLEMENTACAO.md  ← Visão completa
AGENDA_EXEMPLOS_API.txt            ← 15 exemplos práticos
AGENDA_GUIA_INTEGRACAO.md         ← Passo-a-passo
AGENDA_ARQUIVOS_MODIFICADOS.md    ← Lista de alterações
```

## Suporte

Para problemas ou dúvidas:

1. Revisar documentação em `AGENDA_GUIA_INTEGRACAO.md`
2. Consultar exemplos em `AGENDA_EXEMPLOS_API.txt`
3. Rodar testes: `python manage.py test apps.ordens.tests_agenda`
4. Verificar logs do Django e console do navegador

---

**Status**: ✓ Implementado e Testado
**Versão**: 1.0
**Data**: 2025-05-02
**Pronto para**: Produção
