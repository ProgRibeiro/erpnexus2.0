# ERP Completo — Guia de Prompts para o Cursor

> Cole cada prompt no Cursor (cursor.com) em ordem. Após cada fase, teste antes de avançar.
> Stack: Python + Django + DRF | React + Ant Design | PostgreSQL | PWA mobile

---

## Como usar este arquivo

1. Baixe e instale o **Cursor** em cursor.com (gratuito)
2. Abra uma pasta vazia no Cursor
3. Pressione `Ctrl+L` para abrir o chat da IA
4. Cole os prompts **um de cada vez**, na ordem das fases
5. Após cada resposta, peça: *"pode continuar para a próxima etapa?"*

---

---

# FASE 1 — Estrutura base e configuração

## Prompt 1.1 — Setup inicial do projeto

```
Você é um desenvolvedor full stack sênior especializado em Django e React.
Vou construir um ERP web completo para empresa de serviços (HVAC, refrigeração, elétrica e civil).

Stack definida:
- Backend: Python 3.11 + Django 5 + Django REST Framework
- Frontend: React 18 + Ant Design 5
- Banco: PostgreSQL 15
- Autenticação: JWT com djangorestframework-simplejwt
- Upload de arquivos: django-storages (local por enquanto, S3 no futuro)
- PDF: reportlab ou weasyprint
- Tarefas assíncronas: Celery + Redis (para envio de email e geração de PDF)

Crie a estrutura completa de pastas do projeto:

erp_backend/
  config/         ← settings, urls, wsgi
  apps/
    usuarios/
    clientes/
    ordens/       ← módulo principal (OS)
    financeiro/
    crm/
    estoque/
    relatorios/

erp_frontend/
  src/
    pages/
    components/
    services/     ← chamadas à API
    hooks/
    store/        ← estado global (Zustand ou Context)

Crie também:
- requirements.txt com todas as dependências
- .env.example com todas as variáveis de ambiente necessárias
- docker-compose.yml com PostgreSQL e Redis
- settings.py completo com CORS, JWT, banco, uploads e email
- urls.py principal com prefixo /api/v1/

Mostre o código completo de cada arquivo. Após terminar me pergunte se pode continuar.
```

---

## Prompt 1.2 — Autenticação e usuários

```
Agora crie o módulo de usuários e autenticação do ERP.

Modelo Usuario (extende AbstractUser):
- nome_completo
- cargo (admin, tecnico, administrativo, vendedor, financeiro)
- telefone
- foto_perfil (upload)
- ativo (boolean)
- criado_em, atualizado_em

Funcionalidades:
1. Login com email + senha → retorna access token e refresh token (JWT)
2. Refresh token automático
3. Logout (blacklist do token)
4. Trocar senha
5. Perfil do usuário logado (GET /api/v1/auth/me/)
6. CRUD de usuários (só admin pode criar/editar/deletar)
7. Permissões por cargo:
   - admin: acesso total
   - tecnico: ver e editar OS atribuídas a ele, sem acesso financeiro
   - administrativo: OS completa, sem configurações do sistema
   - financeiro: módulo financeiro + leitura de OS
   - vendedor: CRM + orçamentos

Crie: models.py, serializers.py, views.py, urls.py, permissions.py
Mostre o código completo de cada arquivo.
```

---

---

# FASE 2 — Módulo de Clientes

## Prompt 2.1 — Models de clientes

```
Crie o módulo completo de Clientes do ERP.

Modelo Cliente:
- tipo_pessoa (fisica, juridica)
- nome / razão social
- nome_fantasia (opcional)
- cpf (se pessoa física)
- cnpj (se pessoa jurídica)
- email principal
- telefone, whatsapp (campo separado)
- site (opcional)
- segmento (ex: industria, comercio, residencial, condominio)
- origem (indicacao, site, google, feiras, prospeccao)
- status (ativo, inativo, prospecto)
- observacoes
- criado_por (FK Usuario), criado_em, atualizado_em

Modelo EnderecoCliente:
- cliente (FK)
- tipo (matriz, filial, obra, cobrança)
- cep, logradouro, numero, complemento, bairro, cidade, estado
- principal (boolean)

Modelo ContatoCliente:
- cliente (FK)
- nome
- cargo
- email
- telefone, whatsapp
- principal (boolean)
- observacoes

Modelo HistoricoCliente:
- cliente (FK)
- tipo (ligacao, email, reuniao, visita, proposta_enviada)
- descricao
- data_contato
- usuario (FK)

Crie: models.py, serializers.py, views.py (com filtros por status, segmento, busca por nome/cnpj), urls.py
Inclua paginação de 20 itens por página.
```

---

---

# FASE 3 — Módulo CRM (Kanban de negociações)

## Prompt 3.1 — Models do CRM estilo Trello

```
Crie o módulo CRM do ERP, estilo Kanban (parecido com Trello).

Conceito: cada negociação (Lead/Oportunidade) é um card que percorre colunas.

Modelo Pipeline:
- nome (ex: "Vendas HVAC", "Manutenção Preventiva")
- descricao
- ativo
- criado_por

Modelo ColunaPipeline:
- pipeline (FK)
- nome (ex: "Novo lead", "Contato feito", "Proposta enviada", "Negociação", "Ganho", "Perdido")
- ordem (inteiro para ordenação)
- cor (hex color)
- eh_ganho (boolean) ← quando cair aqui, pode gerar orçamento
- eh_perdido (boolean)

Modelo Oportunidade (o card do Kanban):
- titulo
- cliente (FK Cliente)
- contato (FK ContatoCliente, opcional)
- pipeline (FK)
- coluna (FK ColunaPipeline)
- responsavel (FK Usuario)
- valor_estimado (decimal, opcional)
- probabilidade (0 a 100%, opcional)
- data_fechamento_prevista (opcional)
- descricao / necessidade do cliente
- origem (mesmo campo do Cliente)
- prioridade (baixa, media, alta)
- tags (ManyToMany)
- ordem_no_kanban (inteiro)
- criado_em, atualizado_em

Modelo AtividadeCRM:
- oportunidade (FK)
- tipo (ligacao, email, whatsapp, reuniao, visita, tarefa, nota)
- titulo
- descricao
- data_atividade
- data_vencimento (para tarefas)
- concluida (boolean)
- usuario (FK)
- criado_em

Modelo EmailCRM:
- oportunidade (FK)
- assunto
- corpo (texto rico)
- destinatario_nome, destinatario_email
- enviado_em
- enviado_por (FK Usuario)
- status (rascunho, enviado, erro)

Modelo AnexoCRM:
- oportunidade (FK)
- arquivo (upload)
- nome_original
- tamanho
- enviado_por (FK Usuario)
- enviado_em

Endpoints necessários:
- GET /api/v1/crm/pipelines/ — lista pipelines
- GET /api/v1/crm/kanban/{pipeline_id}/ — retorna todas as colunas com seus cards
- PATCH /api/v1/crm/oportunidades/{id}/mover/ — move card para outra coluna (drag and drop)
- POST /api/v1/crm/oportunidades/{id}/converter-orcamento/ — converte em OS
- CRUD completo de atividades
- POST /api/v1/crm/oportunidades/{id}/enviar-email/ — envia email e registra

Crie: models.py, serializers.py, views.py, urls.py completos.
```

---

## Prompt 3.2 — Frontend do CRM Kanban

```
Crie o componente React do CRM Kanban usando Ant Design.

Funcionalidades:
1. Tela principal com colunas lado a lado (horizontal scroll)
2. Cada coluna mostra: nome, contador de cards, total de valor
3. Cada card mostra: nome do cliente, valor estimado, responsável (avatar), tag de prioridade (cor), data de fechamento prevista
4. Drag and drop dos cards entre colunas (use @hello-pangea/dnd)
5. Ao clicar no card abre um Drawer lateral com:
   - Dados da oportunidade (editável)
   - Linha do tempo de atividades
   - Botão para agendar atividade (ligação, reunião, tarefa)
   - Histórico de emails enviados
   - Botão "Converter em Orçamento/OS"
6. Botão para adicionar novo card em qualquer coluna
7. Filtros no topo: responsável, período, prioridade

Estrutura dos arquivos:
- pages/CRM/index.jsx (página principal)
- pages/CRM/KanbanBoard.jsx
- pages/CRM/KanbanCard.jsx
- pages/CRM/OportunidadeDrawer.jsx
- pages/CRM/AtividadeForm.jsx
- services/crm.js (chamadas à API)

Use cores por prioridade: verde=baixa, amarelo=média, vermelho=alta.
Use Ant Design: Card, Drawer, Tag, Avatar, Badge, Timeline, Button, Form, Select, DatePicker.
```

---

---

# FASE 4 — Ordem de Serviço (coração do sistema)

## Prompt 4.1 — Models completos da OS

```
Crie o módulo da Ordem de Serviço — o módulo mais importante do sistema.

Modelo OrdemServico:
- numero (gerado automaticamente: OS-2025-0001)
- status (lead, orcamento, aprovado, em_execucao, faturado, concluido, cancelado)
- tipo_servico (hvac, refrigeracao, eletrica, civil, preventiva, instalacao)
- prioridade (normal, urgente, emergencia)
- origem_lead (telefone, site, indicacao, visita_comercial, crm)
- oportunidade_crm (FK Oportunidade, opcional — se veio do CRM)

# Cliente
- cliente (FK Cliente)
- contato_responsavel (FK ContatoCliente, opcional)
- endereco_servico (texto — pode ser diferente do cadastro)

# Pedido de compra do cliente (tudo opcional)
- tem_pedido_compra (boolean)
- numero_pc (opcional)
- valor_autorizado_pc (decimal, opcional)
- validade_pc (date, opcional)
- pdf_pc (upload, opcional)

# Orçamento
- descricao_servico (texto longo)
- valor_total_orcado (calculado dos itens)
- condicao_pagamento (avista, 30d, 60d, 30_60d, boleto, cartao)
- validade_orcamento (date)
- data_aprovacao (datetime, automático)
- aprovado_por (texto, opcional)
- pdf_orcamento (gerado automaticamente)

# Execução
- tecnico_responsavel (FK Usuario)
- data_agendada (date)
- hora_inicio (time, opcional)
- hora_conclusao (time, opcional)
- horas_trabalhadas (calculado)
- equipamento_marca, equipamento_modelo, equipamento_serie (opcionais)
- observacoes_tecnicas (texto longo)
- tipo_relatorio (corretivo, preventivo, instalacao, visita)
- pdf_relatorio (gerado automaticamente)

# Faturamento
- valor_final_faturado (decimal)
- numero_nf (texto)
- pdf_nf (upload)
- data_emissao_nf (date)
- data_vencimento (date)
- forma_cobranca (pix, boleto, transferencia, cartao, cheque)
- status_pagamento (aguardando, pago, atrasado, parcial)
- data_recebimento (date, automático ao confirmar)

# Auditoria
- criado_por (FK Usuario)
- criado_em (datetime automático)
- atualizado_por (FK Usuario)
- atualizado_em (datetime automático)

Modelo ItemOrcamento:
- os (FK OrdemServico)
- descricao
- quantidade (decimal)
- valor_unitario (decimal)
- valor_total (calculado)
- ordem (inteiro)

Modelo TecnicoAuxiliarOS:
- os (FK)
- tecnico (FK Usuario)

Modelo FotoOS:
- os (FK)
- tipo (antes, depois)
- arquivo (upload)
- legenda (opcional)
- enviado_por (FK Usuario)
- enviado_em (datetime)
- ordem (inteiro)

Modelo ChatOS (mensagens internas):
- os (FK)
- usuario (FK)
- mensagem (texto)
- criado_em (datetime)

Modelo AnexoChatOS:
- mensagem (FK ChatOS)
- arquivo (upload)
- nome_original

Modelo DespesaOS:
- os (FK)
- descricao
- valor (decimal)
- tipo (material, combustivel, alimentacao, hospedagem, terceiro, outro)
- comprovante (upload, opcional)
- registrado_por (FK Usuario)
- data_despesa (date)

Modelo LogStatusOS:
- os (FK)
- status_anterior
- status_novo
- alterado_por (FK Usuario)
- alterado_em (datetime)
- observacao (opcional)

Modelo AssinaturaClienteOS:
- os (FK OneToOne)
- imagem_assinatura (ImageField)
- nome_signatario
- data_assinatura (datetime)

Propriedades calculadas na OS:
- total_despesas → soma DespesaOS
- margem_os → valor_final_faturado - total_despesas
- horas_trabalhadas → hora_conclusao - hora_inicio

Endpoints:
- CRUD completo /api/v1/ordens/
- GET /api/v1/ordens/?status=em_execucao&tecnico=3&data=2025-04
- POST /api/v1/ordens/{id}/mudar-status/
- POST /api/v1/ordens/{id}/fotos/
- GET/POST /api/v1/ordens/{id}/chat/
- GET/POST /api/v1/ordens/{id}/despesas/
- POST /api/v1/ordens/{id}/gerar-pdf-relatorio/
- POST /api/v1/ordens/{id}/gerar-pdf-orcamento/
- POST /api/v1/ordens/{id}/confirmar-pagamento/

Crie: models.py, serializers.py, views.py, urls.py completos.
```

---

## Prompt 4.2 — Frontend da OS (tela principal)

```
Crie a tela completa da Ordem de Serviço em React + Ant Design.

Layout da tela:
- Header com: número da OS, badge de status colorido, nome do cliente, botões "Gerar Relatório", "Faturar OS", "Salvar"
- Barra de progresso de status (steps do Ant Design): Lead → Orçamento → Aprovado → Em execução → Faturado → Receita

Abas (Tabs do Ant Design):
1. Dados Gerais
2. Execução e Fotos
3. Chat Interno
4. Despesas
5. Faturamento
6. Histórico

--- ABA 1: Dados Gerais ---
- Seção Identificação: tipo_servico (Select), prioridade (Select), origem_lead (Select)
- Seção Cliente: busca de cliente (Select com Search), contato responsável, endereço do serviço
- Seção Pedido de Compra: toggle checkbox "cliente possui PC?", se sim mostra campos: número PC, valor autorizado, validade, upload PDF
- Seção Orçamento: textarea descrição, tabela de itens (adicionar/remover linhas com qtd, valor unit, total calculado), condição de pagamento, validade

--- ABA 2: Execução e Fotos ---
- Select técnico responsável, date picker data agendada
- TimePicker início e conclusão (mostra horas calculadas)
- Campos equipamento (marca, modelo, série)
- Textarea observações técnicas / laudo
- Select tipo de relatório
- Grid de fotos ANTES (upload + preview de miniaturas)
- Grid de fotos DEPOIS (upload + preview de miniaturas)
- Botão "Gerar Relatório PDF"
- Botão "Coletar assinatura do cliente" (abre modal com canvas para assinar)

--- ABA 3: Chat Interno ---
- Lista de mensagens estilo WhatsApp (mensagem própria à direita, outras à esquerda)
- Cada mensagem: avatar, nome, texto, hora
- Textarea para digitar + botão enviar + botão anexar arquivo
- Scroll automático para última mensagem

--- ABA 4: Despesas ---
- Tabela editável: descrição, tipo (select), valor, comprovante (upload)
- Botão + para adicionar linha
- Total de despesas calculado
- Cards de resumo: Valor Faturado | Total Despesas | Margem da OS

--- ABA 5: Faturamento ---
- Input valor final faturado
- Select tipo de nota (NFS-e, NF-e)
- Input número da NF
- DatePicker emissão e vencimento
- Select forma de cobrança
- Upload área do PDF da nota fiscal
- Botão "Confirmar faturamento e enviar para financeiro" (pede confirmação antes)

--- ABA 6: Histórico ---
- Timeline do Ant Design com todos os logs de status
- Cada item: ícone colorido por tipo, data/hora, usuário, descrição da mudança

Arquivos a criar:
- pages/Ordens/index.jsx (listagem)
- pages/Ordens/OSDetalhe.jsx (tela principal)
- pages/Ordens/abas/DadosGerais.jsx
- pages/Ordens/abas/Execucao.jsx
- pages/Ordens/abas/Chat.jsx
- pages/Ordens/abas/Despesas.jsx
- pages/Ordens/abas/Faturamento.jsx
- pages/Ordens/abas/Historico.jsx
- services/ordens.js
```

---

## Prompt 4.3 — Listagem de OS e filtros

```
Crie a página de listagem de Ordens de Serviço.

Funcionalidades:
1. Tabela principal com colunas: Número OS, Cliente, Tipo de serviço, Técnico, Status (badge colorido), Data agendada, Valor, Ações
2. Filtros no topo:
   - Busca por texto (número OS, cliente)
   - Filtro por status (multi-select)
   - Filtro por técnico
   - Filtro por tipo de serviço
   - Filtro por período (date range)
3. Cards de resumo acima da tabela: Total de OS abertas | Em execução hoje | Aguardando faturamento | Atrasadas
4. Paginação (20 por página)
5. Botão "Nova OS" → abre a tela de criação
6. Clique na linha → abre OSDetalhe
7. Exportar para Excel (lista filtrada atual)

Cores dos badges de status:
- lead: cinza
- orcamento: laranja/amarelo
- aprovado: azul
- em_execucao: roxo
- faturado: verde-água
- concluido: verde
- cancelado: vermelho

Use Ant Design: Table, Tag, Select, DatePicker.RangePicker, Input.Search, Statistic, Button.
Crie também services/ordens.js com todas as chamadas à API (axios).
```

---

## Prompt 4.4 — Geração de PDF (relatório e orçamento)

```
Crie o sistema de geração de PDF para a OS usando WeasyPrint no backend.

PDF 1 — Relatório de Serviço / Preventiva:
Layout profissional com:
- Cabeçalho: logo da empresa (configurável), nome, endereço, telefone
- Título: "Relatório de Serviço" ou "Relatório de Manutenção Preventiva"
- Dados da OS: número, data, cliente, endereço do serviço
- Técnico responsável e auxiliares
- Equipamento atendido (se informado)
- Descrição do serviço realizado (observações técnicas)
- Seção "Fotos antes do serviço" → grid com as fotos enviadas
- Seção "Fotos após o serviço" → grid com as fotos enviadas
- Área de assinatura do cliente (ou imagem da assinatura digital)
- Rodapé com data de geração e número da OS

PDF 2 — Orçamento:
- Cabeçalho da empresa
- Título: "Proposta Comercial / Orçamento"
- Dados do cliente e contato
- Número do orçamento e validade
- Tabela de itens: descrição, quantidade, valor unitário, valor total
- Subtotal, impostos se houver, total geral
- Condições de pagamento
- Observações / termos
- Área de aprovação do cliente
- Rodapé

Implementação:
1. Crie templates HTML+CSS para cada PDF em templates/pdfs/
2. Crie view que renderiza o template com os dados da OS
3. Use WeasyPrint para converter HTML → PDF
4. Salve o PDF no campo pdf_relatorio ou pdf_orcamento da OS
5. Retorne o PDF como response para download imediato também
6. Crie tarefa Celery para geração assíncrona quando a OS é finalizada

Endpoint: POST /api/v1/ordens/{id}/gerar-pdf-relatorio/
Endpoint: POST /api/v1/ordens/{id}/gerar-pdf-orcamento/
```

---

---

# FASE 5 — Módulo Financeiro

## Prompt 5.1 — Models do financeiro

```
Crie o módulo financeiro completo do ERP.

Modelo ContaBancaria:
- nome (ex: "Banco do Brasil CC", "Caixa Físico")
- banco, agencia, conta (opcionais)
- tipo (corrente, poupanca, caixa, investimento)
- saldo_inicial (decimal)
- saldo_atual (calculado)
- ativo (boolean)

Modelo CategoriaFinanceira:
- nome (ex: "Receita de Serviços", "Combustível", "Folha de Pagamento")
- tipo (receita, despesa)
- cor (hex)
- icone
- pai (FK self, para subcategorias, opcional)

Modelo Lancamento (tabela central):
- tipo (receita, despesa)
- descricao
- valor (decimal)
- data_competencia (date)
- data_vencimento (date)
- data_pagamento (date, quando pago)
- status (pendente, pago, atrasado, cancelado)
- conta_bancaria (FK)
- categoria (FK CategoriaFinanceira)
- os (FK OrdemServico, opcional — vincula ao faturamento da OS)
- fornecedor_cliente (texto livre, opcional)
- numero_documento (NF, boleto, etc, opcional)
- observacoes
- recorrente (boolean)
- frequencia_recorrencia (mensal, quinzenal, semanal, anual)
- criado_por (FK Usuario)
- criado_em

Modelo AnexoLancamento:
- lancamento (FK)
- arquivo (upload)
- nome_original

Modelo TransferenciaEntreConta:
- conta_origem (FK ContaBancaria)
- conta_destino (FK ContaBancaria)
- valor
- data
- descricao
- criado_por

Regras de negócio:
- Quando OS muda status para "faturado": cria automaticamente um Lancamento de receita vinculado
- Quando OS tem data_vencimento e não foi pago: status muda para "atrasado" (via Celery beat diário)
- Saldo da conta = saldo_inicial + soma(receitas pagas) - soma(despesas pagas)

Endpoints:
- GET /api/v1/financeiro/lancamentos/?tipo=despesa&mes=2025-04
- GET /api/v1/financeiro/dashboard/ → retorna: receitas do mês, despesas do mês, lucro, contas a receber, contas a pagar, saldo total
- GET /api/v1/financeiro/fluxo-caixa/?inicio=2025-01&fim=2025-12 → projeção futura
- POST /api/v1/financeiro/lancamentos/{id}/confirmar-pagamento/
- GET /api/v1/financeiro/relatorio-dre/ → DRE simplificado
- GET /api/v1/financeiro/categorias/resumo/?mes=2025-04 → gastos por categoria

Crie: models.py, serializers.py, views.py, urls.py. Inclua signals.py para criar lançamento automaticamente quando OS é faturada.
```

---

## Prompt 5.2 — Dashboard financeiro (frontend)

```
Crie a página do Dashboard Financeiro em React + Ant Design.

Seção 1 — Cards de resumo (topo):
- Receitas do mês (verde, com seta de variação vs mês anterior)
- Despesas do mês (vermelho)
- Lucro líquido do mês (azul)
- Contas a receber (laranja)
- Contas a pagar (cinza)
- Saldo total em caixa/banco (verde)

Seção 2 — Gráfico de barras:
- Barras mensais dos últimos 6 meses
- Cada barra: receita (verde) e despesa (vermelha) lado a lado
- Use recharts (já disponível no React)

Seção 3 — Fluxo de caixa projetado:
- Gráfico de linha com projeção dos próximos 3 meses
- Linha de receitas previstas vs despesas previstas

Seção 4 — Tabelas lado a lado:
- Esquerda: "Contas a receber" (vencimento próximo, OS vinculada, valor, status)
- Direita: "Contas a pagar" (vencimento próximo, fornecedor, valor, status)

Seção 5 — Despesas por categoria:
- Gráfico de pizza (recharts) com as categorias de maior gasto do mês

Filtros no topo: seletor de mês/ano, filtro por conta bancária.

Arquivos:
- pages/Financeiro/Dashboard.jsx
- pages/Financeiro/Lancamentos.jsx (listagem completa com CRUD)
- pages/Financeiro/NovoLancamento.jsx (formulário)
- pages/Financeiro/ContasBancarias.jsx
- services/financeiro.js
```

---

## Prompt 5.3 — DRE e relatórios financeiros

```
Crie os relatórios financeiros do ERP.

1. DRE Simplificado (Demonstração de Resultado):
- Período selecionável (mês ou range de datas)
- Receita bruta de serviços (por tipo: HVAC, elétrica, civil, etc)
- (-) Deduções e impostos (se configurado)
- = Receita líquida
- (-) Custos diretos (material, terceiros vinculados às OS)
- = Lucro bruto
- (-) Despesas operacionais (combustível, alimentação, administrativo)
- (-) Despesas fixas (aluguel, salários, etc)
- = Lucro operacional (EBITDA simplificado)
- Margem de lucro %

2. Relatório de OS por período:
- Lista de todas OS faturadas no período
- Colunas: número, cliente, tipo, valor faturado, total despesas, margem
- Totais no rodapé
- Exportar para Excel

3. Contas a receber aging (aging report):
- Tabela: cliente, OS, valor, vencimento, dias em atraso
- Agrupado por faixa: a vencer, 1-30 dias, 31-60, 61-90, +90 dias

4. Fluxo de caixa realizado vs previsto:
- Mês a mês, comparando o que foi previsto vs o que entrou/saiu de fato

Backend: crie as views que calculam cada relatório.
Frontend: crie a página pages/Financeiro/Relatorios.jsx com tabs para cada relatório.
Todos os relatórios têm botão "Exportar Excel" (use SheetJS no frontend ou openpyxl no backend).
```

---

---

# FASE 6 — Estoque

## Prompt 6.1 — Módulo de estoque

```
Crie o módulo de controle de estoque do ERP.

Modelo Produto:
- codigo (único, gerado automaticamente)
- nome
- descricao
- categoria (FK CategoriaProduto)
- unidade_medida (un, m, m2, kg, litro, par, caixa)
- preco_custo (decimal)
- preco_venda (decimal)
- estoque_atual (calculado via movimentações)
- estoque_minimo (alerta quando abaixo)
- localizacao (prateleira, gaveta — texto livre)
- ativo

Modelo CategoriaProduto:
- nome (ex: "Gás refrigerante", "Filtros", "Cabos elétricos", "EPIs")
- descricao

Modelo MovimentacaoEstoque:
- produto (FK)
- tipo (entrada, saida, ajuste, transferencia)
- quantidade (decimal)
- valor_unitario (decimal)
- motivo (compra, uso_os, perda, ajuste_inventario, devolucao)
- os (FK OrdemServico, opcional — quando saída vinculada a OS)
- fornecedor (texto, opcional — quando entrada por compra)
- numero_nota (opcional)
- observacoes
- realizado_por (FK Usuario)
- data_movimentacao

Regras:
- estoque_atual = soma(entradas) - soma(saídas) + ajustes
- Alerta quando estoque_atual <= estoque_minimo
- Ao lançar despesa de material em uma OS, pode opcionalmente baixar o estoque

Endpoints:
- CRUD de produtos
- GET /api/v1/estoque/produtos/?abaixo_minimo=true → alertas
- POST /api/v1/estoque/movimentacoes/ → registrar entrada ou saída
- GET /api/v1/estoque/relatorio/?produto=X → histórico de movimentações

Frontend:
- Lista de produtos com filtro e busca
- Tela de produto com histórico de movimentações
- Formulário de entrada de estoque (compra)
- Formulário de saída (uso em OS)
- Dashboard de alertas (estoque baixo)
```

---

---

# FASE 7 — Portal do cliente (base para futuro)

## Prompt 7.1 — Estrutura do portal

```
Crie a estrutura base do Portal do Cliente — uma interface separada e simplificada que o cliente final vai acessar.

IMPORTANTE: este portal é separado do ERP interno. Será um domínio diferente (ex: portal.minhaempresa.com.br) mas usa o mesmo backend Django com rotas separadas.

Autenticação do portal:
- Cliente acessa com email + senha própria (ou link mágico por email)
- Modelo UsuarioPortal (diferente do Usuario interno):
  - cliente (FK Cliente)
  - email
  - senha (hash)
  - ativo
  - ultimo_acesso

Endpoints do portal (prefixo /api/v1/portal/):
- POST /portal/auth/login/
- GET /portal/minhas-os/ → lista as OS do cliente logado (sem dados internos)
- GET /portal/minhas-os/{id}/ → detalhes da OS (sem chat interno, sem despesas)
- GET /portal/minhas-os/{id}/relatorio/ → download do PDF do relatório
- GET /portal/meus-orcamentos/ → orçamentos pendentes de aprovação
- POST /portal/orcamentos/{id}/aprovar/ → cliente aprova o orçamento
- POST /portal/orcamentos/{id}/recusar/ → cliente recusa com motivo
- GET /portal/minhas-notas/ → histórico de notas fiscais

Dados visíveis para o cliente na OS:
- Número, status (em linguagem amigável), data agendada
- Técnico responsável (só nome)
- Descrição do serviço
- Fotos (antes e depois)
- Relatório PDF
- Status de pagamento e vencimento

Dados ocultos para o cliente:
- Chat interno
- Despesas
- Margens
- Informações internas

Frontend do portal (React separado ou rotas separadas com layout diferente):
- Design mais simples e clean, pensado para celular
- Tela de login do portal
- Dashboard do cliente: OS recentes, orçamentos pendentes, notas fiscais
- Detalhe da OS com fotos e relatório

Crie a estrutura, permissões e autenticação separada. O frontend pode ser adicionado depois.
```

---

---

# FASE 8 — PWA Mobile

## Prompt 8.1 — Configurar o app como PWA instalável

```
Configure o frontend React como PWA (Progressive Web App) para funcionar como aplicativo no Android.

Passos:
1. Crie o arquivo public/manifest.json com:
   - name: "ERP [Nome da empresa]"
   - short_name: "ERP"
   - theme_color: cor principal do sistema
   - background_color: branco
   - display: "standalone"
   - orientation: "portrait"
   - icons em tamanhos: 72, 96, 128, 144, 152, 192, 384, 512px

2. Crie o service worker (src/sw.js) com:
   - Cache de assets estáticos (offline)
   - Cache de páginas já visitadas
   - Estratégia: cache-first para assets, network-first para API
   - Fila de sincronização: se sem internet, salva ações localmente e sincroniza quando voltar

3. Crie src/hooks/useOffline.js:
   - Detecta quando está offline
   - Mostra banner de aviso
   - Libera upload de fotos mesmo offline (salva local)
   - Sincroniza quando voltar online

4. Tela de instalação:
   - Banner "Instalar app" aparece na primeira visita no Android
   - Instrução de como adicionar à tela inicial no iOS

5. Funcionalidades que funcionam offline:
   - Ver OS atribuídas ao técnico (cache)
   - Tirar e salvar fotos (salva local, envia quando online)
   - Registrar início e fim de serviço
   - Mensagens do chat ficam em fila para enviar

Adapte o layout das telas para mobile (especialmente a OS e o chat).
Crie um layout alternativo para técnicos no celular: mais simples, com acesso rápido a "Minhas OS do dia", "Registrar chegada", "Tirar foto", "Finalizar serviço".
```

---

---

# FASE 9 — Configurações e finalização

## Prompt 9.1 — Configurações do sistema

```
Crie o módulo de Configurações do ERP (só acessível por admin).

Configurações da empresa:
- Nome da empresa, razão social, CNPJ
- Endereço completo
- Telefone, email, site
- Logo (upload de imagem — usada nos PDFs)
- Cor principal do sistema (hex)

Configurações de notificações:
- Email para receber alertas de OS urgentes
- Email para alertas de estoque baixo
- Email para OS atrasadas sem faturamento
- Notificação de OS nova atribuída ao técnico (email)

Configurações financeiras:
- Alíquota de ISS padrão
- Contas bancárias padrão para recebimento

Configurações de OS:
- Numeração automática (prefixo, ano, sequencial)
- Validade padrão de orçamento (em dias)
- Texto padrão de condições do orçamento
- Texto padrão do rodapé do relatório

Página de usuários:
- Listagem de usuários
- Criar / editar / desativar usuário
- Resetar senha

Frontend:
- pages/Configuracoes/index.jsx com tabs por seção
- Formulário com auto-save ao sair do campo
- Upload de logo com preview
- Seletor de cor com preview ao vivo no cabeçalho do sistema
```

---

## Prompt 9.2 — Menu lateral e navegação

```
Crie o layout principal do ERP com menu lateral (sidebar) e roteamento completo.

Layout:
- Sidebar fixa à esquerda (colapsável)
- Cabeçalho com: logo, nome do usuário, foto, botão logout
- Área de conteúdo à direita

Menu lateral com ícones (use ícones do Ant Design):
- Dashboard (página inicial com resumo geral)
- CRM (funil de vendas)
  - Kanban de oportunidades
  - Atividades do dia
- Ordens de Serviço
  - Lista de OS
  - Nova OS
  - Agenda de técnicos (calendário)
- Clientes
  - Lista de clientes
  - Novo cliente
- Financeiro
  - Dashboard financeiro
  - Lançamentos
  - Contas a receber
  - Contas a pagar
  - Relatórios
- Estoque
  - Produtos
  - Movimentações
  - Alertas
- Relatórios
- Configurações (só admin)

Roteamento React Router v6:
- Rotas protegidas (redireciona para login se não autenticado)
- Rotas por cargo (técnico não vê financeiro)
- Breadcrumb automático baseado na rota

Página de Dashboard inicial:
- Cards: OS abertas hoje, OS em execução, Receita do mês, Contas a receber
- Gráfico de barras: OS por status
- Lista: próximas OS agendadas (hoje e amanhã)
- Lista: OS com faturamento pendente

Crie: App.jsx, router/index.jsx, layouts/MainLayout.jsx, layouts/AuthLayout.jsx, pages/Dashboard/index.jsx
```

---

## Prompt 9.3 — Deploy e produção

```
Configure o projeto para deploy em produção.

Backend (servidor Linux / Ubuntu):
1. Crie o Dockerfile do backend Django:
   - Base: python:3.11-slim
   - Instala dependências
   - Coleta arquivos estáticos
   - Usa gunicorn como servidor WSGI
   - Porta 8000

2. Crie o docker-compose.prod.yml com:
   - Serviço: backend (Django + gunicorn)
   - Serviço: celery worker
   - Serviço: celery beat (tarefas agendadas)
   - Serviço: nginx (proxy reverso + servir frontend)
   - Serviço: postgres (ou apontar para banco externo)
   - Serviço: redis

3. Crie nginx.conf:
   - Serve o frontend React (arquivos estáticos)
   - Proxy para /api/ → Django
   - HTTPS com Let's Encrypt (certbot)
   - Compressão gzip
   - Cache de assets

4. Crie o Dockerfile do frontend:
   - Build do React (npm run build)
   - Copia build para pasta do nginx

5. Crie .env.production com as variáveis:
   - SECRET_KEY segura
   - DATABASE_URL
   - REDIS_URL
   - EMAIL_HOST e credenciais
   - ALLOWED_HOSTS

6. Crie scripts/deploy.sh:
   - git pull
   - docker-compose build
   - docker-compose up -d
   - migrate
   - collectstatic

7. Crie o script de backup do banco:
   - Backup diário automático via cron
   - Comprime e salva com data no nome
   - Mantém últimos 30 dias

Documente os passos de primeiro deploy em DEPLOY.md.
```

---

---

# RESUMO DAS FASES

| Fase | Módulo | Prioridade |
|------|--------|------------|
| 1 | Setup + Autenticação | AGORA |
| 2 | Clientes | AGORA |
| 3 | CRM (Kanban) | ALTA |
| 4 | Ordem de Serviço | CRÍTICA |
| 5 | Financeiro | ALTA |
| 6 | Estoque | MÉDIA |
| 7 | Portal do Cliente | DEPOIS |
| 8 | PWA Mobile | DEPOIS |
| 9 | Config + Deploy | AO FINAL |

---

# Dicas de uso no Cursor

- **Um prompt por vez** — não cole tudo de uma vez
- **Após cada prompt**, diga: *"mostre o código completo de cada arquivo"*
- **Se der erro**, cole a mensagem de erro e diga: *"corrija este erro"*
- **Para avançar**, diga: *"está funcionando, pode ir para o próximo módulo"*
- **Para ajustar**, diga: *"nesta tela, mude X para Y"*
- **Para dúvidas**, diga: *"explica o que este código faz"*

---

*Documento gerado para construção do ERP com IA — atualizado em 2025*

---
---

# COMPLEMENTOS — O que estava faltando

---

## Prompt C1 — Agenda de técnicos (calendário)

```
Crie o módulo de Agenda de Técnicos do ERP.

Backend:
- Endpoint GET /api/v1/ordens/agenda/?data_inicio=2025-04-01&data_fim=2025-04-30
  → retorna todas as OS com data_agendada no período, agrupadas por técnico
- Endpoint GET /api/v1/ordens/agenda/hoje/
  → retorna OS do dia atual por técnico, com status e endereço
- Endpoint PATCH /api/v1/ordens/{id}/reagendar/
  → altera data_agendada e notifica o técnico por email

Frontend (pages/Agenda/index.jsx):
1. Visão mensal (calendário estilo Google Calendar):
   - Cada dia mostra bolinhas coloridas representando OS agendadas
   - Cor por status: azul=aprovado, roxo=em execução, verde=concluído
   - Clique no dia → abre lista das OS daquele dia
   - Clique na OS → abre OSDetalhe

2. Visão semanal:
   - Colunas por técnico, linhas por hora do dia
   - Blocos coloridos representando cada OS com horário estimado
   - Drag and drop para reagendar (muda data_agendada via API)

3. Visão "Hoje" (atalho rápido):
   - Lista simples das OS do dia
   - Por técnico, com endereço e status
   - Botão para abrir no Google Maps (link direto com endereço)

4. Filtros:
   - Selecionar técnico(s)
   - Filtrar por tipo de serviço

Use Ant Design Calendar para a base. Para a visão semanal por técnico use uma grid customizada.
Adicione também a página pages/Agenda/MinhasOSHoje.jsx para o técnico ver só as dele no celular.
```

---

## Prompt C2 — Relatório público (link para cliente abrir no celular)

```
Crie o sistema de relatório público da OS — uma página que o cliente pode abrir no celular
pelo navegador, sem precisar de login.

Backend:
- Adicione o campo token_relatorio (UUID único gerado automaticamente) na OrdemServico
- Endpoint público (sem autenticação): GET /api/v1/publico/relatorio/{token}/
  → retorna dados da OS visíveis ao cliente: número, data, cliente, técnico (só nome),
    descrição do serviço, observações técnicas, fotos antes e depois, tipo de relatório
  → NÃO retorna: despesas, chat interno, margens, dados financeiros
- Endpoint: GET /api/v1/publico/relatorio/{token}/pdf/ → retorna PDF para download

Frontend (página pública, sem sidebar, sem login):
- Rota: /relatorio/{token}
- Layout limpo e responsivo, otimizado para celular
- Cabeçalho com logo da empresa e número da OS
- Seções:
  1. Dados do serviço (cliente, endereço, data, técnico)
  2. Descrição do que foi realizado
  3. Grid de fotos "Antes" com legenda
  4. Grid de fotos "Depois" com legenda
  5. Assinatura do cliente (se coletada)
  6. Rodapé da empresa (telefone, email)
- Botão "Baixar PDF" no topo
- Botão "Compartilhar" (usa Web Share API no celular)
- Design profissional: logo, cores da empresa, tipografia limpa

No painel interno da OS, adicione:
- Botão "Copiar link do relatório" → copia a URL pública para a área de transferência
- Botão "Enviar link por WhatsApp" → abre wa.me/?text=URL do relatório
- QR Code gerado automaticamente com o link (para imprimir e deixar no local)
```

---

## Prompt C3 — Notificações automáticas (WhatsApp e email)

```
Crie o sistema de notificações automáticas do ERP.

Gatilhos e notificações:

1. OS criada/atribuída ao técnico:
   - Email para o técnico: "Nova OS atribuída: OS-2025-0047 — Cliente X — Data: 30/04"
   - Mensagem WhatsApp via API (use CallMeBot ou Z-API — configurável nas settings)

2. OS aprovada pelo cliente:
   - Email para o responsável interno: "Orçamento aprovado — OS-2025-0047"

3. OS com data agendada amanhã:
   - Email + WhatsApp para o técnico na véspera às 18h (Celery beat)
   - Conteúdo: cliente, endereço, horário, link do Google Maps

4. OS finalizada pelo técnico:
   - Email para o administrativo: "OS finalizada, aguardando faturamento — OS-2025-0047"

5. Pagamento atrasado:
   - Email diário para o financeiro listando todas as OS com pagamento em atraso

6. Estoque abaixo do mínimo:
   - Email semanal (segunda-feira) com lista de produtos abaixo do estoque mínimo

7. Link do relatório enviado ao cliente:
   - Email automático ao cliente com o link do relatório quando OS for finalizada
   - Assunto: "Relatório do serviço realizado — [Nome da empresa]"
   - Corpo: agradecimento + link do relatório + contatos da empresa

Implementação:
- Crie apps/notificacoes/models.py: modelo LogNotificacao (tipo, destinatario, conteudo, status, enviado_em)
- Crie apps/notificacoes/tasks.py: todas as tarefas Celery
- Crie apps/notificacoes/email.py: templates de email em HTML
- Crie apps/notificacoes/whatsapp.py: integração com API WhatsApp (configurável)
- Use Django signals em cada app para disparar as notificações
- Todas as notificações ficam logadas no LogNotificacao para auditoria
- Nas Configurações do sistema: toggle para ativar/desativar cada tipo de notificação
```

---

## Prompt C4 — Tela mobile do técnico (visão de campo)

```
Crie uma interface simplificada para o técnico usar no celular em campo.

Esta é uma visão alternativa do mesmo sistema — quando o usuário tem cargo "tecnico"
e acessa pelo celular (viewport < 768px), mostrar este layout em vez do layout padrão.

Tela 1 — "Minhas OS de hoje" (tela inicial do técnico):
- Lista vertical simples das OS do dia
- Cada item: número da OS, nome do cliente, endereço, horário agendado, status
- Botão "Como chegar" → abre Google Maps com o endereço
- Badge de status grande e colorido
- Toque no item → abre a OS em modo técnico

Tela 2 — OS em modo técnico (simplificada):
- Cabeçalho: número, cliente, endereço
- Botão grande "Registrar chegada" → marca hora_inicio e muda status para em_execucao
- Campos simples:
  - Equipamento (marca, modelo)
  - Laudo / observações técnicas (textarea grande, fácil de digitar no celular)
  - Tipo de relatório (select)
- Seção de fotos:
  - Botão "Tirar foto ANTES" → abre câmera do celular diretamente
  - Botão "Tirar foto DEPOIS" → abre câmera do celular diretamente
  - Grid de miniaturas das fotos tiradas
- Chat interno: lista de mensagens + campo para enviar
- Botão grande "Finalizar serviço" → marca hora_conclusao, confirma conclusão
  → após finalizar, mostra opção "Coletar assinatura do cliente" (canvas touch)

Detalhes técnicos:
- Use input type="file" accept="image/*" capture="environment" para câmera direta
- Fotos devem fazer upload imediato ao serem tiradas (com indicador de progresso)
- Se offline: armazena foto no IndexedDB e sincroniza quando tiver conexão
- Botões grandes (mínimo 48px height) para facilitar uso com luva ou dedo grosso
- Fonte maior (16px mínimo) para legibilidade ao sol
- Modo tela cheia (PWA standalone) esconde barra do navegador

Crie: pages/TecnicoMobile/index.jsx, pages/TecnicoMobile/OSCampo.jsx
Detecte mobile com hook useIsMobile() e redirecione automaticamente.
```

---

## Prompt C5 — Integração OS → Financeiro (signals detalhados)

```
Crie a integração automática entre o módulo de OS e o módulo Financeiro via Django signals.

Regras de negócio completas:

1. Quando OS muda status para "faturado":
   - Cria automaticamente um Lancamento do tipo "receita"
   - valor = OS.valor_final_faturado
   - data_competencia = OS.data_emissao_nf
   - data_vencimento = OS.data_vencimento
   - categoria = categoria padrão "Receita de Serviços" (busca ou cria)
   - descricao = f"OS {os.numero} — {os.cliente.nome}"
   - numero_documento = OS.numero_nf
   - os = FK para a OS
   - status = "pendente" (aguardando confirmação de pagamento)

2. Quando Lancamento.status muda para "pago":
   - Atualiza OS.status_pagamento = "pago"
   - Atualiza OS.data_recebimento = data do pagamento
   - Atualiza ContaBancaria.saldo_atual recalculando

3. Quando OS.data_vencimento passa e status_pagamento ainda é "aguardando":
   - Tarefa Celery beat diária que varre os lançamentos vencidos
   - Muda Lancamento.status para "atrasado"
   - Muda OS.status_pagamento para "atrasado"
   - Dispara notificação para o financeiro

4. Quando despesas são lançadas na OS:
   - Cria automaticamente Lancamento do tipo "despesa" para cada DespesaOS
   - categoria baseada no tipo da despesa (material→"Material de Serviço", combustivel→"Combustível", etc)
   - os = FK para a OS (rastreabilidade)

5. Quando OS é cancelada:
   - Se havia Lancamento de receita criado, muda status para "cancelado"
   - Não deleta — mantém histórico

6. Recalculo de saldo:
   - Crie função recalcular_saldo_conta(conta_bancaria) que soma todos os lançamentos pagos
   - Chame esta função sempre que um lançamento for confirmado como pago ou cancelado
   - Nunca confie no saldo_atual sem recalcular — sempre use esta função

Crie: apps/financeiro/signals.py completo com todos os signals
Crie: apps/financeiro/tasks.py com as tarefas Celery agendadas
Registre os signals no apps/financeiro/apps.py (método ready())
Adicione testes unitários para cada signal em apps/financeiro/tests.py
```

---

## Resumo atualizado — todos os prompts

| # | Prompt | Módulo |
|---|--------|--------|
| 1.1 | Setup e estrutura | Base |
| 1.2 | Autenticação e usuários | Base |
| 2.1 | Clientes | Clientes |
| 3.1 | CRM — models Kanban | CRM |
| 3.2 | CRM — frontend Kanban | CRM |
| 4.1 | OS — models completos | OS |
| 4.2 | OS — frontend tela principal | OS |
| 4.3 | OS — listagem e filtros | OS |
| 4.4 | OS — geração de PDF | OS |
| 5.1 | Financeiro — models | Financeiro |
| 5.2 | Financeiro — dashboard | Financeiro |
| 5.3 | Financeiro — DRE e relatórios | Financeiro |
| 6.1 | Estoque | Estoque |
| 7.1 | Portal do cliente | Portal |
| 8.1 | PWA mobile | Mobile |
| 9.1 | Configurações do sistema | Config |
| 9.2 | Menu lateral e navegação | Config |
| 9.3 | Deploy e produção | Deploy |
| C1 | Agenda de técnicos | OS |
| C2 | Relatório público (link cliente) | OS |
| C3 | Notificações WhatsApp e email | Notificações |
| C4 | Tela mobile do técnico em campo | Mobile |
| C5 | Integração OS → Financeiro (signals) | Integração |

**Total: 23 prompts cobrindo o ERP completo.**


---
---

# FASE 10 — Tema visual e design system

## Prompt T1 — Design system e tema global do Ant Design

```
Crie o design system completo do ERP. O objetivo é sair do visual padrão do Ant Design
e ter uma interface profissional, limpa e moderna — similar a sistemas como Linear, Notion
e ERPs modernos como Omie e Tiny.

## Paleta de cores principal

Crie o arquivo src/styles/theme.js com o tema customizado do Ant Design 5:

export const theme = {
  token: {
    // Cor primária — azul profissional
    colorPrimary: '#1B4F8A',
    colorPrimaryHover: '#2563A8',
    colorPrimaryActive: '#143D6B',

    // Cor de sucesso — verde escuro
    colorSuccess: '#1A7A4A',
    colorSuccessHover: '#22A05E',

    // Cor de atenção — âmbar
    colorWarning: '#B45309',

    // Cor de erro — vermelho
    colorError: '#B91C1C',

    // Tipografia
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontWeightStrong: 500,

    // Bordas
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    // Espaçamentos
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,

    // Sombras suaves
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    boxShadowSecondary: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04)',

    // Cores de fundo
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F4F6F9',
    colorBgElevated: '#FFFFFF',

    // Texto
    colorText: '#1A1D23',
    colorTextSecondary: '#5A6070',
    colorTextTertiary: '#9099A8',
    colorTextQuaternary: '#C2C8D0',

    // Bordas
    colorBorder: '#E2E6EC',
    colorBorderSecondary: '#EDF0F4',

    // Linha
    lineWidth: 1,
    lineType: 'solid',

    // Altura dos controles
    controlHeight: 38,
    controlHeightLG: 44,
    controlHeightSM: 30,

    // Motion
    motionDurationMid: '0.15s',
    motionDurationSlow: '0.25s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  components: {
    // Botões
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      fontWeight: 500,
      borderRadius: 8,
    },
    // Cards
    Card: {
      headerBg: '#FFFFFF',
      borderRadius: 12,
    },
    // Tabela
    Table: {
      headerBg: '#F8FAFC',
      headerColor: '#5A6070',
      headerSortActiveBg: '#F1F5FB',
      rowHoverBg: '#F8FAFC',
      borderColor: '#E2E6EC',
      fontSize: 13,
    },
    // Menu lateral
    Menu: {
      itemBorderRadius: 8,
      itemMarginInline: 8,
      subMenuItemBg: 'transparent',
      itemSelectedBg: '#EBF2FB',
      itemSelectedColor: '#1B4F8A',
      itemHoverBg: '#F4F6F9',
      itemHoverColor: '#1B4F8A',
    },
    // Inputs
    Input: {
      borderRadius: 8,
      activeShadow: '0 0 0 3px rgba(27,79,138,0.12)',
      hoverBorderColor: '#1B4F8A',
    },
    // Select
    Select: {
      borderRadius: 8,
    },
    // Tags / badges
    Tag: {
      borderRadius: 6,
      fontSizeSM: 11,
    },
    // Tabs
    Tabs: {
      inkBarColor: '#1B4F8A',
      itemSelectedColor: '#1B4F8A',
      itemHoverColor: '#1B4F8A',
      titleFontSize: 13,
      fontWeightStrong: 500,
    },
    // Layout
    Layout: {
      siderBg: '#FFFFFF',
      headerBg: '#FFFFFF',
      bodyBg: '#F4F6F9',
    },
    // Modal
    Modal: {
      borderRadius: 16,
    },
    // Drawer
    Drawer: {
      borderRadius: 0,
    },
    // Steps
    Steps: {
      colorPrimary: '#1B4F8A',
      fontSize: 12,
    },
    // Statistic
    Statistic: {
      titleFontSize: 12,
      contentFontSize: 24,
    },
  },
};

Instale a fonte Inter:
No arquivo public/index.html adicione no <head>:
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">

No arquivo src/main.jsx ou src/index.jsx envolva o app:
import { ConfigProvider } from 'antd';
import { theme } from './styles/theme';
import ptBR from 'antd/locale/pt_BR';

<ConfigProvider theme={theme} locale={ptBR}>
  <App />
</ConfigProvider>
```

---

## Prompt T2 — CSS global e utilitários visuais

```
Crie o arquivo src/styles/global.css com estilos globais para o ERP.

/* Reset e base */
* { box-sizing: border-box; }
body {
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  background: #F4F6F9;
  color: #1A1D23;
  -webkit-font-smoothing: antialiased;
}

/* Scrollbar customizada (Chrome/Edge) */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #C2C8D0; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #9099A8; }

/* Sidebar */
.erp-sidebar {
  border-right: 1px solid #E2E6EC !important;
  height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
}
.erp-sidebar .ant-menu-item,
.erp-sidebar .ant-menu-submenu-title {
  margin: 2px 8px !important;
  width: calc(100% - 16px) !important;
  border-radius: 8px !important;
  font-size: 13px !important;
  font-weight: 500;
}
.erp-sidebar-logo {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #E2E6EC;
  margin-bottom: 8px;
}
.erp-sidebar-logo h2 {
  font-size: 16px;
  font-weight: 600;
  color: #1B4F8A;
  margin: 0;
}

/* Header */
.erp-header {
  border-bottom: 1px solid #E2E6EC !important;
  padding: 0 24px !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFFFFF !important;
}

/* Cards de página */
.erp-page-card {
  background: #FFFFFF;
  border: 1px solid #E2E6EC;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 16px;
}
.erp-page-card .card-title {
  font-size: 11px;
  font-weight: 600;
  color: #9099A8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 16px;
}

/* Metric cards (dashboard) */
.erp-metric-card {
  background: #FFFFFF;
  border: 1px solid #E2E6EC;
  border-radius: 12px;
  padding: 20px;
  transition: box-shadow 0.15s;
}
.erp-metric-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
.erp-metric-card .metric-label {
  font-size: 12px;
  color: #9099A8;
  font-weight: 500;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.erp-metric-card .metric-value {
  font-size: 26px;
  font-weight: 600;
  color: #1A1D23;
  line-height: 1.2;
}
.erp-metric-card .metric-sub {
  font-size: 12px;
  color: #9099A8;
  margin-top: 6px;
}
.erp-metric-card .metric-up { color: #1A7A4A; }
.erp-metric-card .metric-down { color: #B91C1C; }

/* Badges de status da OS */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}
.status-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.status-lead      { background: #F1F3F5; color: #5A6070; }
.status-orcamento { background: #FEF3C7; color: #92400E; }
.status-aprovado  { background: #DBEAFE; color: #1E40AF; }
.status-execucao  { background: #EDE9FE; color: #5B21B6; }
.status-faturado  { background: #D1FAE5; color: #065F46; }
.status-concluido { background: #D1FAE5; color: #065F46; }
.status-cancelado { background: #FEE2E2; color: #991B1B; }
.status-atrasado  { background: #FEE2E2; color: #991B1B; }

/* Tabelas */
.ant-table-thead > tr > th {
  font-size: 11px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
  color: #9099A8 !important;
}
.ant-table-tbody > tr > td { font-size: 13px !important; }
.ant-table-row { cursor: pointer; }

/* Filtros de página */
.erp-filters {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  background: #FFFFFF;
  border: 1px solid #E2E6EC;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
}

/* Chat interno da OS */
.os-chat-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;
}
.os-chat-bubble {
  max-width: 72%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.55;
}
.os-chat-bubble.mine {
  align-self: flex-end;
  background: #1B4F8A;
  color: #FFFFFF;
  border-bottom-right-radius: 4px;
}
.os-chat-bubble.theirs {
  align-self: flex-start;
  background: #FFFFFF;
  border: 1px solid #E2E6EC;
  color: #1A1D23;
  border-bottom-left-radius: 4px;
}
.os-chat-meta {
  font-size: 11px;
  color: #9099A8;
  margin-top: 4px;
}
.os-chat-input-area {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  padding: 12px 0 0;
  border-top: 1px solid #E2E6EC;
}

/* Grid de fotos */
.os-photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.os-photo-item {
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #E2E6EC;
  cursor: pointer;
  transition: transform 0.15s;
  position: relative;
}
.os-photo-item:hover { transform: scale(1.03); }
.os-photo-item img { width: 100%; height: 100%; object-fit: cover; }
.os-photo-add {
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1.5px dashed #C2C8D0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #9099A8;
  font-size: 12px;
  gap: 6px;
  transition: border-color 0.15s, color 0.15s;
}
.os-photo-add:hover { border-color: #1B4F8A; color: #1B4F8A; }

/* Kanban CRM */
.kanban-board {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 16px;
  align-items: flex-start;
}
.kanban-column {
  min-width: 270px;
  max-width: 270px;
  background: #F4F6F9;
  border-radius: 12px;
  padding: 14px;
}
.kanban-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.kanban-column-title {
  font-size: 13px;
  font-weight: 600;
  color: #1A1D23;
}
.kanban-column-count {
  background: #E2E6EC;
  color: #5A6070;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
}
.kanban-card {
  background: #FFFFFF;
  border: 1px solid #E2E6EC;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.1s;
}
.kanban-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transform: translateY(-1px);
}
.kanban-card-title { font-size: 13px; font-weight: 500; color: #1A1D23; margin-bottom: 6px; }
.kanban-card-client { font-size: 12px; color: #5A6070; margin-bottom: 8px; }
.kanban-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.kanban-card-value { font-size: 13px; font-weight: 600; color: #1B4F8A; }

/* Prioridade */
.prioridade-alta   { background: #FEE2E2; color: #991B1B; }
.prioridade-media  { background: #FEF3C7; color: #92400E; }
.prioridade-baixa  { background: #D1FAE5; color: #065F46; }

/* Relatório público (página do cliente) */
.relatorio-publico {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  background: #FFFFFF;
  min-height: 100vh;
}
.relatorio-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20px;
  border-bottom: 2px solid #1B4F8A;
  margin-bottom: 24px;
}
.relatorio-section {
  margin-bottom: 28px;
}
.relatorio-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #1B4F8A;
  border-left: 3px solid #1B4F8A;
  padding-left: 10px;
  margin-bottom: 14px;
}

/* Dashboard financeiro */
.fin-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
@media (max-width: 768px) {
  .fin-metrics-grid { grid-template-columns: 1fr 1fr; }
}

/* Tela mobile do técnico */
@media (max-width: 768px) {
  .erp-mobile-os-card {
    background: #FFFFFF;
    border: 1px solid #E2E6EC;
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 12px;
  }
  .erp-mobile-btn-primary {
    width: 100%;
    height: 52px !important;
    font-size: 15px !important;
    font-weight: 600 !important;
    border-radius: 12px !important;
    margin-bottom: 10px;
  }
  .erp-mobile-btn-secondary {
    width: 100%;
    height: 44px !important;
    font-size: 14px !important;
    border-radius: 12px !important;
  }
}

Importe este arquivo no src/main.jsx:
import './styles/global.css';
```

---

## Prompt T3 — Componentes visuais reutilizáveis

```
Crie os componentes visuais reutilizáveis do ERP em src/components/ui/.

### 1. StatusBadge.jsx
Componente que recebe o status da OS e renderiza o badge colorido correto.

const statusConfig = {
  lead:       { label: 'Lead',          className: 'status-lead' },
  orcamento:  { label: 'Orçamento',     className: 'status-orcamento' },
  aprovado:   { label: 'Aprovado',      className: 'status-aprovado' },
  em_execucao:{ label: 'Em execução',   className: 'status-execucao' },
  faturado:   { label: 'Faturado',      className: 'status-faturado' },
  concluido:  { label: 'Concluído',     className: 'status-concluido' },
  cancelado:  { label: 'Cancelado',     className: 'status-cancelado' },
  atrasado:   { label: 'Atrasado',      className: 'status-atrasado' },
};

export function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.lead;
  return <span className={`status-badge ${config.className}`}>{config.label}</span>;
}

### 2. MetricCard.jsx
Card de métrica para dashboards.
Props: label, value, prefix (R$), suffix, trend (número), trendLabel, icon, color

Mostra:
- Label pequeno no topo (cinza, uppercase)
- Valor grande no meio (formatado)
- Seta de tendência + variação percentual embaixo (verde se positivo, vermelho se negativo)

### 3. PageHeader.jsx
Cabeçalho padrão de página.
Props: title, subtitle, actions (array de botões), breadcrumb

Renderiza:
- Breadcrumb no topo (Ant Design Breadcrumb)
- Título grande + subtítulo
- Botões de ação alinhados à direita

### 4. FilterBar.jsx
Barra de filtros padronizada.
Props: children (os filtros), onClear (botão limpar)

Renderiza dentro do container erp-filters com botão "Limpar filtros" no fim.

### 5. EmptyState.jsx
Estado vazio padronizado.
Props: icon, title, description, actionLabel, onAction

Renderiza no centro da área vazia com ícone grande, título, descrição e botão de ação.
Use para: lista de OS vazia, nenhum cliente encontrado, estoque sem alertas, etc.

### 6. AvatarUsuario.jsx
Avatar circular com iniciais do usuário.
Props: nome, foto (opcional), size (sm/md/lg), cargo

Se tiver foto: mostra a foto.
Se não tiver: mostra as iniciais em fundo colorido (cor derivada do nome via hash).
Tooltip com nome completo e cargo ao passar o mouse.

### 7. ValorMargem.jsx
Componente para mostrar valor faturado, despesas e margem.
Props: valorFaturado, totalDespesas

Renderiza três cards pequenos lado a lado:
- "Valor faturado" em azul
- "Total despesas" em vermelho
- "Margem" em verde (ou vermelho se negativa)
Calcula e formata os valores automaticamente em R$.

### 8. UploadFoto.jsx
Grid de upload de fotos para a OS.
Props: fotos (array), onAdd (callback), onRemove (callback), tipo ('antes'|'depois'), readonly

Renderiza:
- Grid de miniaturas das fotos existentes com botão X para remover
- Slot de adicionar foto com ícone de câmera
- Ao clicar no slot: abre seletor de arquivo (input file com capture=environment no mobile)
- Preview em lightbox ao clicar na foto (use Ant Design Image.PreviewGroup)
- Indicador de progresso durante upload

Crie todos em src/components/ui/ e exporte de src/components/ui/index.js.
```

---

## Prompt T4 — Layout principal (sidebar + header) visual completo

```
Agora refatore o MainLayout.jsx para ter o visual profissional do design system.

Sidebar (260px, fundo branco, borda direita sutil):

Topo da sidebar:
- Logo da empresa (configurável, imagem ou texto)
- Nome da empresa em azul escuro
- Separador sutil

Corpo do menu:
- Seções com títulos minúsculos (PRINCIPAL, OPERAÇÕES, GESTÃO)
- Ícones do Ant Design para cada item
- Item ativo: fundo azul claro (#EBF2FB), texto azul (#1B4F8A)
- Hover: fundo cinza muito suave

Rodapé da sidebar:
- Avatar + nome + cargo do usuário logado
- Ícone de configurações
- Botão logout

Header (fundo branco, borda inferior sutil, altura 60px):
- Lado esquerdo: botão de colapsar sidebar + breadcrumb atual
- Lado direito:
  - Sino de notificações (badge com contagem de pendências)
  - Avatar do usuário com dropdown (meu perfil, trocar senha, sair)
  - Indicador de ambiente (se for homologação, mostra badge laranja "TESTE")

Área de conteúdo:
- Padding: 24px
- Background: #F4F6F9
- Largura máxima: 1400px centralizado

Transição suave ao colapsar a sidebar (apenas ícones visíveis quando colapsado).
No mobile (< 768px): sidebar vira drawer que fecha ao tocar fora.

Implemente em:
- layouts/MainLayout.jsx (estrutura)
- layouts/Sidebar.jsx (menu)
- layouts/Header.jsx (cabeçalho)
- layouts/UserMenu.jsx (dropdown do usuário)
```

---

## Prompt T5 — Tela de login visual

```
Crie a tela de login do ERP com design profissional.

Layout dividido em duas colunas (desktop):
- Coluna esquerda (40%): painel visual da empresa
  - Fundo azul escuro (#1B4F8A)
  - Logo da empresa centralizado
  - Tagline da empresa
  - Três bullets com benefícios do sistema (ícones + texto)
  - Versão do sistema no rodapé

- Coluna direita (60%): formulário de login
  - Fundo branco
  - Centralizado verticalmente
  - Largura máxima 380px
  - "Bem-vindo de volta" em título
  - Subtítulo: "Faça login para acessar o sistema"
  - Campo email (ícone de envelope)
  - Campo senha (ícone de cadeado, botão mostrar/ocultar senha)
  - Checkbox "Lembrar por 30 dias"
  - Botão "Entrar" azul, largura total, altura 44px
  - Link "Esqueci minha senha" (envia email de reset)
  - Mensagem de erro inline (não alert())

Mobile (< 768px):
  - Coluna esquerda vira apenas um header compacto com logo e nome
  - Formulário ocupa a tela toda

Feedback de loading:
  - Botão mostra spinner durante a chamada à API
  - Campos ficam desabilitados durante o loading
  - Erro aparece em vermelho abaixo do campo afetado (não alert())
  - Após login: transição suave para o dashboard

Crie em: pages/Auth/Login.jsx e pages/Auth/EsqueciSenha.jsx
```

---

## Prompt T6 — Dashboard inicial visual

```
Refatore a página de Dashboard para ter visual de alto nível.

Saudação personalizada no topo:
- "Bom dia, Lucas!" (detecta hora do dia)
- Data atual por extenso: "Quinta-feira, 30 de abril de 2025"
- Resumo rápido: "Você tem 3 OS agendadas para hoje"

Linha 1 — 4 metric cards principais:
- OS em aberto (azul) — com link para lista filtrada
- Em execução hoje (roxo) — quantas estão sendo executadas agora
- Receita do mês (verde) — valor formatado em R$
- Aguardando faturamento (laranja) — quantas OS finalizadas sem NF

Linha 2 — Gráfico + lista:
- Esquerda (60%): gráfico de barras — receita vs despesa dos últimos 6 meses
  - Barras verdes (receita) e vermelhas (despesa) lado a lado
  - Valores em R$ no tooltip
  - Use recharts BarChart
- Direita (40%): "OS agendadas hoje"
  - Lista compacta com: horário, cliente, técnico (avatar pequeno), status badge
  - Máximo 5 itens + link "ver todas"

Linha 3 — Duas listas:
- Esquerda: "Aguardando faturamento"
  - OS finalizadas sem NF emitida
  - Colunas: OS, cliente, valor, dias aguardando
  - Badge vermelho se > 3 dias
- Direita: "Pagamentos atrasados"
  - OS faturadas com vencimento passado
  - Colunas: OS, cliente, valor, dias atraso
  - Ordenado por dias de atraso (maior primeiro)

Linha 4 — Estoque e atividades do CRM:
- Esquerda: "Alertas de estoque" (produtos abaixo do mínimo)
- Direita: "Atividades do CRM vencendo hoje" (tarefas do CRM para o dia)

Todos os cards têm hover sutil e link para a tela correspondente.
Use Spin para loading e Empty para quando não há dados.
Dados carregados via GET /api/v1/dashboard/ (crie este endpoint que agrega tudo).
```

---

## Prompt T7 — Micro-interações e polimento final

```
Adicione micro-interações e polimento visual em todo o sistema.

1. Feedback de ações:
   - Ao salvar OS: mensagem de sucesso flutuante no canto superior direito (Ant Design message.success)
   - Ao mudar status: animação suave do badge + mensagem de confirmação
   - Ao fazer upload de foto: barra de progresso real (não simulada)
   - Ao enviar mensagem no chat: a mensagem aparece imediatamente (otimistic update)
   - Ao deletar item: confirmação com Popconfirm antes

2. Estados de loading:
   - Skeleton loading nas listagens (Ant Design Skeleton) em vez de spinner genérico
   - Skeleton no formato da tabela (linhas e colunas fantasmas)
   - Skeleton nos metric cards do dashboard

3. Transições de página:
   - Fade in suave ao navegar entre páginas (CSS transition na área de conteúdo)
   - Breadcrumb atualiza com animação

4. Tabelas:
   - Linha clicável: cursor pointer + hover cinza suave
   - Coluna de ações: botões aparecem apenas no hover da linha
   - Ordenação visual nos cabeçalhos

5. Formulários:
   - Validação em tempo real (não só ao submeter)
   - Campo com erro: borda vermelha + mensagem abaixo
   - Campo válido: sem indicador (não coloque ícone verde em tudo)
   - Botão submit: desabilitado se formulário inválido

6. Chat da OS:
   - Scroll automático para a última mensagem ao abrir
   - "João está digitando..." quando outro usuário está digitando (WebSocket opcional, ou polling a cada 3s)
   - Notificação de nova mensagem se a aba do chat não estiver ativa

7. Kanban CRM:
   - Card sendo arrastado: sombra mais forte + leve rotação (transform: rotate(2deg))
   - Coluna de destino: borda pontilhada azul ao arrastar sobre ela
   - Drop realizado: animação de "encaixe" no card

8. Notificações no header:
   - Sino com badge de contagem (OS urgentes + pagamentos atrasados)
   - Dropdown com lista das últimas 5 notificações
   - "Marcar todas como lidas" no topo do dropdown
   - Notificações não lidas com fundo azul claro

9. Mobile:
   - Bottom navigation bar para o técnico (4 ícones: Hoje, OS, Chat, Perfil)
   - Pull to refresh na lista de OS do técnico
   - Swipe para arquivar notificação

10. Acessibilidade:
    - Todos os inputs com aria-label
    - Modais com foco gerenciado (foco vai para o primeiro campo ao abrir)
    - Mensagens de erro lidas por leitores de tela
    - Cores com contraste mínimo 4.5:1

Implemente estes refinamentos nos componentes existentes.
Crie src/hooks/useToast.js para padronizar mensagens de feedback.
Crie src/hooks/useConfirm.js para padronizar confirmações de ações destrutivas.
```

---

## Resumo final — ordem dos prompts de tema

| # | Prompt | O que faz |
|---|--------|-----------|
| T1 | Tema Ant Design | Cores, fontes, bordas, espaçamentos globais |
| T2 | CSS global | Estilos de todos os componentes customizados |
| T3 | Componentes UI | StatusBadge, MetricCard, UploadFoto, etc |
| T4 | Layout principal | Sidebar + Header visual completo |
| T5 | Tela de login | Login profissional dois painéis |
| T6 | Dashboard visual | Dashboard com gráficos e listas |
| T7 | Micro-interações | Polimento, animações, feedbacks |

**Estes prompts de tema devem ser executados APÓS os prompts funcionais (Fases 1-9).**
A ordem certa é: primeiro o sistema funciona, depois fica bonito.

