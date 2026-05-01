# ERP NOVO EM PRODUÇÃO — Instruções permanentes

## Contexto do projeto

ERP web completo para empresa de serviços: HVAC,
refrigeração, elétrica e civil.

## Stack obrigatória

- Backend: Python 3.11 + Django 5 + Django REST Framework
- Frontend: React 18 + Ant Design 5 + Vite
- Banco: PostgreSQL 15
- Autenticação: JWT com simplejwt
- Tarefas: Celery + Redis
- Upload: django-storages

## Regras que sempre deve seguir

- Responda sempre em português brasileiro
- Crie os arquivos diretamente no projeto, nunca só mostre o código
- Confirme o caminho de cada arquivo criado
- Nunca sobrescreva arquivos existentes sem avisar
- Sempre rode migrations após criar ou alterar models
- Sempre faça commit após concluir cada fase
- Nunca use "..." ou "resto do código aqui" — sempre código completo

## O que já foi concluído

- Fase 1: usuarios, JWT, autenticação frontend, Git
- Fase 2: clientes e ordens
- Fase 3: CRM Kanban
- Fase 4: financeiro
- Fase 5: estoque
- Fase 6: complementos, portal, notificações
- Fase 7: PWA mobile (manifest, service worker, offline, técnico campo)
- Fase 8: tema visual e UI (Ant Design 5, componentes, layouts, refactoring)
- Fase 9: geração de PDF (WeasyPrint, templates, Celery, frontend buttons)
- Fase 10: deploy e produção (Docker, docker-compose, Nginx, SSL/TLS, scripts de backup) ✓ CONCLUÍDO

## Módulos do projeto

- usuarios (concluído)
- clientes
- ordens (coração do sistema)
- financeiro (concluído)
- crm (kanban estilo Trello) (concluído)
- estoque (concluído)
- relatorios
- Fase 6: complementos, portal e notificações (concluído)

## Padrão de rotas

Todas as rotas no prefixo /api/v1/

## Padrão de commits

"Fase X: descrição do que foi feito"
