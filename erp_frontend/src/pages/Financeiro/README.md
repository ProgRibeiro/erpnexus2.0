# Módulo Financeiro - FASE 5.2 e 5.3

Implementação completa do módulo financeiro do ERP com dashboards, lançamentos e relatórios.

## Estrutura de Arquivos

```
src/pages/Financeiro/
├── Dashboard.jsx                 # Dashboard principal com métricas e gráficos
├── Lancamentos.jsx              # CRUD de lançamentos com filtros avançados
├── Relatorios.jsx               # Relatórios financeiros com tabs
├── ContasBancarias.jsx          # Gerenciamento de contas (existente)
├── NovoLancamento.jsx           # Formulário novo lançamento (existente)
├── components/
│   ├── GraficoReceita.jsx       # Componente gráfico receita vs despesa
│   ├── TabelaLancamentos.jsx    # Tabela reutilizável de lançamentos
│   ├── RelatorioPersonalizado.jsx # Componente de relatório personalizável
│   └── index.js                 # Exports dos componentes
```

## Páginas Implementadas

### 1. Dashboard.jsx
Dashboard completo com:
- **6 Metric Cards**: Receitas, Despesas, Lucro, Contas a Receber, Contas a Pagar, Saldo Total
- **Gráfico Barras**: Receitas vs Despesas (últimos 6 meses)
- **Gráfico Linha**: Fluxo de caixa projetado
- **Tabelas**: Contas a receber e pagar lado a lado
- **Gráfico Pizza**: Despesas por categoria
- **Filtros**: Mês, Ano, Conta Bancária

**Componentes Utilizados**:
- MetricCard (custom)
- TabelaContasReceber
- TabelaContasPagar
- Recharts (Bar, Line, Pie)

### 2. Lancamentos.jsx
Gerenciamento completo de lançamentos com:
- **Listagem Paginada**: 20 itens por página
- **Filtros Avançados**: Busca, Tipo (Receita/Despesa), Categoria, Status, Período
- **CRUD Completo**: Criar, Editar, Deletar, Visualizar
- **Ações**:
  - Confirmar pagamento (para lançamentos pendentes)
  - Editar (drawer)
  - Deletar (com confirmação)
  - Visualizar (drawer com detalhes)
- **FormularioLancamento**: Drawer com todos os campos

**Campos do Formulário**:
- Descrição (obrigatório)
- Tipo (Receita/Despesa - obrigatório)
- Categoria (obrigatório)
- Valor (obrigatório)
- Conta Bancária (obrigatório)
- Data de Vencimento (obrigatório)
- Data de Pagamento (opcional)
- Observações (opcional)

### 3. Relatorios.jsx
Relatórios financeiros organizados em tabs:

#### Tab 1: DRE Simplificada
Demonstração de Resultado do Exercício com:
- Receita Bruta
- Deduções
- Receita Líquida
- Custo de Vendas
- Lucro Bruto
- Despesas Operacionais
- EBITDA
- Depreciação/Amortização
- EBIT
- Despesas Financeiras
- Resultado Líquido
- Margem Líquida

#### Tab 2: Relatório OS por Período
Análise de Ordens de Serviço com:
- Tabela: Status, Quantidade, Valor Total, Valor Médio
- **Botão Exportar Excel**: Gera arquivo .xlsx com os dados

#### Tab 3: Aging de Contas a Receber
Análise de vencimentos com cards para cada faixa:
- A Vencer (verde)
- 1 a 30 dias (verde claro)
- 31 a 60 dias (laranja)
- 61 a 90 dias (laranja escuro)
- Acima de 90 dias (vermelho)
- Percentuais e total

#### Tab 4: Fluxo Realizado vs Previsto
Tabela comparativa com:
- Período
- Previsto
- Realizado
- Variação (valor e percentual)

**Filtro Global**: Período (RangePicker)

## Componentes Reutilizáveis

### GraficoReceita.jsx
Componente para visualizar receitas vs despesas em gráfico de barras.

```jsx
import { GraficoReceita } from "@/pages/Financeiro/components";

<GraficoReceita
  data={dados}
  loading={carregando}
  title="Receitas e Despesas"
  height={300}
  showLegend={true}
  colors={{ receita: "#16a34a", despesa: "#dc2626" }}
/>
```

### TabelaLancamentos.jsx
Tabela reutilizável para lançamentos com ações.

```jsx
import { TabelaLancamentos } from "@/pages/Financeiro/components";

<TabelaLancamentos
  data={lancamentos}
  loading={carregando}
  pagination={{ current: 1, pageSize: 20, total: 100 }}
  onChange={handlePaginationChange}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onView={handleView}
  title="Lançamentos"
/>
```

### RelatorioPersonalizado.jsx
Componente para exibir relatórios personalizados.

```jsx
import { RelatorioPersonalizado } from "@/pages/Financeiro/components";

// Tipo: "resumo" (cards) ou "detalhado" (análise completa)
<RelatorioPersonalizado
  data={dadosFinanceiro}
  loading={carregando}
  type="resumo"
/>
```

## API Service (financeiro.js)

```javascript
// Dashboard
financeiroService.dashboard(params)

// Fluxo de Caixa
financeiroService.fluxoCaixa(params)

// DRE
financeiroService.dre(params)

// Lançamentos
financeiroService.listarLancamentos(params)
financeiroService.criarLancamento(payload)
financeiroService.atualizarLancamento(id, payload)
financeiroService.removerLancamento(id)
financeiroService.confirmarPagamento(id, payload)

// Contas Bancárias
financeiroService.listarContas()
financeiroService.salvarConta(payload, id)

// Categorias
financeiroService.listarCategorias(params)
financeiroService.salvarCategoria(payload, id)
financeiroService.resumoCategorias(params)
```

## Roteamento

Adicione as seguintes rotas no seu App.jsx ou router principal:

```jsx
import FinanceiroDashboard from "@/pages/Financeiro/Dashboard";
import LancamentosPage from "@/pages/Financeiro/Lancamentos";
import RelatoriosPage from "@/pages/Financeiro/Relatorios";

// Nas rotas:
{
  path: "/financeiro/dashboard",
  element: <FinanceiroDashboard />,
},
{
  path: "/financeiro/lancamentos",
  element: <LancamentosPage />,
},
{
  path: "/financeiro/relatorios",
  element: <RelatoriosPage />,
}
```

## Estilos e Design

- **Cores Principais**:
  - Azul: #3B82F6 (primary)
  - Verde: #16a34a (positive/receita)
  - Vermelho: #dc2626 (negative/despesa)
  - Laranja: #EA8C55 (warning)
  - Cyan: #0891b2 (neutral)

- **Card Style**: Bordas suaves, sombras discretas
- **Responsivo**: Funciona em mobile, tablet e desktop
- **Fonte**: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI'

## Funcionalidades Principais

✓ Dashboard com 6 métricas
✓ Gráficos (barras, linha, pizza)
✓ CRUD de lançamentos
✓ Filtros avançados
✓ Relatórios financeiros
✓ Aging de contas a receber
✓ Exportação para Excel
✓ Confirmação de pagamentos
✓ Design responsivo
✓ Validações de formulário
✓ Mensagens de sucesso/erro

## Melhorias Futuras

- [ ] Importação em lote de lançamentos
- [ ] Reconciliação bancária
- [ ] Projeção de fluxo de caixa
- [ ] Gráficos mais avançados
- [ ] Integração com gateway de pagamento
- [ ] Notificações de vencimento
- [ ] Análise de tendências
- [ ] Comparativo período a período
