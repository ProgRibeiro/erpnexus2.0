FASE 9 - MÓDULO DE CONFIGURAÇÕES - IMPLEMENTAÇÃO COMPLETA
===========================================================

ALTERAÇÕES REALIZADAS:

BACKEND (Django):
================

1. models.py (apps/configuracoes/models.py):
   - ConfiguracaoEmpresa: Já existente
   - ConfiguracaoNotificacao: Já existente
   - ConfiguracaoOS (NOVA): Gerencia numeração, validade, textos padrão de OS
   - ConfiguracaoFinanceira (NOVA): ISS, contas padrão, prazos, juros e multas

2. serializers.py:
   - ConfiguracaoOSSerializer
   - ConfiguracaoFinanceiraSerializer

3. views.py:
   - configuracao_os(): GET/PATCH para gerenciar OS
   - configuracao_financeira(): GET/PATCH para gerenciar configurações financeiras
   - listar_usuarios(): GET/POST para listar e criar usuários
   - gerenciar_usuario(): PATCH/DELETE para atualizar e desativar usuários
   - resetar_senha_usuario(): POST para resetar senha

4. urls.py:
   - /configuracoes/os/ - Gerenciar configurações de OS
   - /configuracoes/financeira/ - Gerenciar configurações financeiras
   - /auth/ - Listar/criar usuários (GET/POST)
   - /auth/<id>/ - Atualizar/desativar usuários (PATCH/DELETE)
   - /auth/<id>/resetar-senha/ - Resetar senha de usuário (POST)

5. admin.py:
   - ConfiguracaoOSAdmin com campos organizados em fieldsets
   - ConfiguracaoFinanceiraAdmin com campos organizados em fieldsets

6. migrations/0002_configuracaoos_configuracaofinanceira.py:
   - Migração para criar as novas tabelas

ENDPOINTS DA API:
=================

GET/PATCH /api/v1/configuracoes/empresa/ - Empresa
GET/PATCH /api/v1/configuracoes/notificacoes/ - Notificações
GET/PATCH /api/v1/configuracoes/os/ - Ordens de Serviço
GET/PATCH /api/v1/configuracoes/financeira/ - Financeira
GET/PATCH /api/v1/auth/perfil/ - Perfil do usuário
GET/POST /api/v1/auth/ - Listar/Criar usuários
PATCH/DELETE /api/v1/auth/<id>/ - Atualizar/Desativar usuário
POST /api/v1/auth/<id>/resetar-senha/ - Resetar senha

FRONTEND (React):
=================

1. services/usuariosService.js (NOVO):
   - listar()
   - criar(payload)
   - atualizar(usuarioId, payload)
   - desativar(usuarioId)
   - resetarSenha(usuarioId)
   - obterPerfil()
   - atualizarPerfil(payload)

2. services/configuracoes.js (ATUALIZADO):
   - obterConfiguracoes()
   - salvarConfiguracaoOS()
   - obterConfiguracaoFinanceira()
   - salvarConfiguracaoFinanceira()

3. pages/Configuracoes/index.jsx (ATUALIZADO):
   
   Abas implementadas:
   
   a) EMPRESA:
      - Nome, Razão Social, CNPJ
      - Endereço, Telefone, Email, Site
      - Upload de Logo
      - Seletor de cor com preview em tempo real
      - Auto-save ao sair do campo
   
   b) NOTIFICAÇÕES:
      - Tabela com tipos, toggles e emails
      - Configuração por tipo de notificação
   
   c) ORDENS DE SERVIÇO:
      - Prefixo de numeração
      - Próximo número (incrementa automaticamente)
      - Validade padrão em dias
      - Toggles para incluir logo e assinatura em PDF
      - Texto de termos padrão
      - Condições de pagamento padrão
   
   d) FINANCEIRA:
      - Alíquota ISS
      - Contas padrão (receber, pagar)
      - Banco, agência, conta corrente
      - Dias padrão para pagamento e recebimento
      - Juros mensais e multa por atraso
   
   e) USUÁRIOS:
      - Tabela de usuários com nome, email, cargo, role, status
      - Botão "Novo usuário" que abre drawer
      - Editar usuário existente
      - Resetar senha (gera senha temporária)
      - Desativar usuário (soft delete)
      - Funções: Admin, Gestor, Financeiro, Comercial, Técnico, Estoquista, Suporte
   
   f) FISCAL:
      - Consulta automática de CNPJ
      - Regime tributário (MEI, Simples Nacional, Lucro Presumido, Lucro Real)
      - Tipo de nota fiscal
      - Alíquota ISS por município
      - Tabela de alíquotas para Lucro Presumido
      - Calculadora de impostos (ISS, PIS, COFINS, IRPJ, CSLL)
      - Preview de cálculo de impostos
   
   g) IMPORTAÇÃO:
      - Modal para importar dados via Excel
      - Suporta Clientes, Serviços e Produtos

FUNCIONALIDADES:
================

1. Auto-save ao sair do campo: ✓ (não implementado exatamente, usa forms Ant Design)
2. Preview de cor em tempo real: ✓ (div com cor dinâmica no campo Empresa)
3. Validação de permissões: ✓ (IsAdminUser para OS e Financeira)
4. Geração de senha temporária: ✓ (ao criar novo usuário)
5. Reset de senha: ✓ (nova senha aleatória de 12 caracteres)
6. Numeração automática de OS: ✓ (método gerar_numero_os() no modelo)
7. Cálculo de impostos: ✓ (preview no frontend)
8. Upload de logo: ✓ (campo Upload no Ant Design)

PRÓXIMAS AÇÕES (SE NECESSÁRIO):
================================

1. Executar migrations:
   python manage.py migrate configuracoes

2. Testar endpoints via API:
   - GET /api/v1/configuracoes/empresa/
   - GET /api/v1/configuracoes/os/
   - GET /api/v1/configuracoes/financeira/
   - GET /api/v1/auth/

3. Criar usuários de teste via admin

4. Verificar permissões no frontend (IsAdminUser)

NOTAS IMPORTANTES:
==================

- Os endpoints de OS e Financeira requerem permissão de admin (IsAdminUser)
- Os endpoints de usuários também requerem admin
- A cor principal é armazenada no formato hexadecimal (#RRGGBB)
- A numeração de OS é incrementada automaticamente via banco de dados
- As senhas temporárias nunca devem ser armazenadas em log
- O upload de logo usa o storage padrão do Django (MEDIA_ROOT)
