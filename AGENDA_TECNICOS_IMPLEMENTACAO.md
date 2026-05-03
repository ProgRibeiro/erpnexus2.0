# Agenda de Técnicos (C1) - Implementação Completa

## Sumário da Implementação

### Backend (Django REST Framework)

#### 1. Endpoints Implementados em `apps/ordens/views.py`

**GET `/api/v1/ordens/agenda/`**
- Parâmetros:
  - `data_inicio` (YYYY-MM-DD): Data de início do período
  - `data_fim` (YYYY-MM-DD): Data de fim do período
  - `tecnico` (ID): Filtrar por técnico específico (opcional)
  - `tipo_servico`: Filtrar por tipo de serviço (opcional)

- Resposta: Array de objetos com estrutura:
```json
[
  {
    "data": "2025-04-15",
    "tecnicos": [
      {
        "id": 1,
        "nome_completo": "João Silva",
        "username": "joao.silva",
        "total_os": 3,
        "ordens": [
          {
            "id": 1,
            "numero": "OS-2025-0001",
            "cliente_nome": "Empresa XYZ",
            "data_agendada": "2025-04-15",
            "hora_inicio": "09:00:00",
            "status": "agendada",
            ...
          }
        ]
      }
    ]
  }
]
```

**GET `/api/v1/ordens/agenda/hoje/`**
- Retorna apenas OS agendadas para hoje
- Se usuário for técnico, retorna apenas suas OS
- Ordenadas por hora de início

**PATCH `/api/v1/ordens/{id}/reagendar/`**
- Body:
```json
{
  "data_agendada": "2025-04-20",
  "hora_inicio": "14:30:00",
  "tecnico_responsavel": 2
}
```
- Cria log automático de alteração
- Retorna OS atualizada

#### 2. Serializers Novos em `apps/ordens/serializers.py`

- `AgendaSerializer`: Serializer para resposta de agenda
- `TecnicoAgendaSerializer`: Serializer para técnico com suas OS

### Frontend (React + Ant Design)

#### 1. Serviço `services/agenda.js`
```javascript
agendaService.listarPorPeriodo(dataInicio, dataFim, tecnico?, tipoServico?)
agendaService.agendaHoje()
agendaService.reagendar(id, payload)
agendaService.reagendarDragDrop(id, novaData, novaHora?)
```

#### 2. Página `pages/Agenda/index.jsx`
Componente com 3 visões principais:

**Visão Mensal**
- Calendário Ant Design mostrando quantidade de OS por técnico por dia
- Filtros: técnico, tipo de serviço
- Seletor de período

**Visão Semanal**
- Grade horária por técnico
- Horas de 08:00 a 15:00
- Clique para editar agendamento
- Modal para reagendar com data e hora

**Visão Hoje**
- Lista simples de OS do dia
- Ordenadas por horário
- Botão "Como chegar" (Google Maps)
- Informações: número, cliente, endereço, horário, status

**Filtros**
- Técnico: dropdown com técnicos disponíveis
- Tipo de Serviço: dropdown com tipos
- Data de início/fim (visão mensal)

**Modal de Edição**
- Reagendamento com data e hora
- Validação de campos

#### 3. Página `pages/Agenda/MinhasOSHoje.jsx`
Visão simplificada para técnico em mobile:

**Funcionalidades:**
- Resumo: total de OS e concluídas
- Lista de OS do dia com:
  - Número e status com badge
  - Cliente
  - Horário (início e conclusão)
  - Endereço com ícone
  - Descrição do serviço
  - Tipo de serviço (tag)
  
- Botões de ação:
  - "Como chegar" - abre Google Maps
  - WhatsApp - inicia conversa com cliente
  - Email - abre cliente de email

- Auto-atualização a cada 30 segundos

### Estrutura de Status Filtrados

Os endpoints de agenda filtram apenas OS com status:
- `agendada`: Agendadas para execução
- `em_execucao`: Atualmente em andamento

Outros status como `rascunho`, `aberta`, `orcamento_enviado`, etc. não aparecem na agenda.

## Fluxo de Uso

### Para Gerente/Administrativo
1. Acessar página `/agenda`
2. Escolher visão (mensal, semanal ou hoje)
3. Aplicar filtros (técnico, tipo de serviço)
4. Clicar em uma OS para reagendar
5. Modal permite alterar data/hora
6. Clica em "Salvar" - log automático de alteração

### Para Técnico em Campo
1. Acessar `/agenda/minhas-os-hoje` (mobile)
2. Ver lista de OS do dia com horários
3. Clicar em "Como chegar" para Google Maps
4. Usar WhatsApp ou Email para contato com cliente
5. Auto-atualiza a cada 30 segundos

## Filtros de Permissão

- `GET /agenda/hoje/` com `role=tecnico`: retorna apenas suas OS
- `GET /agenda/` com qualquer role: retorna todas as OS agendadas (com filtros opcionais)

## Logs de Alteração

Cada reagendamento cria automaticamente um `LogStatusOS` com:
- OS afetada
- Status anterior e novo (mesmo se permanecer igual)
- Usuário que fez a alteração
- Observação descrevendo a reagendagem
- Data/hora da alteração

## Observações Técnicas

- Todos os endpoints retornam resposta JSON
- Tratamento de erros com mensagens em português
- Componentes otimizados com `useMemo` para performance
- Integração com Ant Design para UI/UX consistente
- Suporte a drag-and-drop futuro (base preparada no service)

## Próximas Melhorias Sugeridas

1. Implementar drag-and-drop na visão semanal/mensal
2. Notificação de técnico via email/WhatsApp quando reagendado
3. Histórico de reagendamentos
4. Export de agenda em PDF/Excel
5. Integração com calendário (iCal)
6. Validação de conflitos de horário
7. Sugestão automática de horário baseada em localização
