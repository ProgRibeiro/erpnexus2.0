from django.db import migrations


CHECKLISTS = [
    {
        "tipo_servico": "corretiva",
        "nome": "Checklist - Manutencao corretiva geral",
        "descricao": "Diagnostico, inspecao, testes, intervencao, validacao e finalizacao do atendimento corretivo.",
        "secoes": [
            ("Diagnostico inicial", [
                "Qual e o problema relatado pelo cliente?",
                "Quando o problema comecou?",
                "O equipamento/sistema parou totalmente ou parcialmente?",
                "Ha historico de falhas anteriores?",
            ]),
            ("Inspecao tecnica", [
                "Existem sinais visuais de dano (queima, vazamento, desgaste)?",
                "Ha ruidos, vibracoes ou aquecimento anormal?",
                "Componentes estao soltos ou mal fixados?",
                "Ha sinais de curto-circuito ou sobrecarga?",
            ]),
            ("Testes", [
                "O equipamento energiza corretamente?",
                "Os parametros eletricos estao dentro do padrao?",
                "O sistema responde aos comandos normalmente?",
            ]),
            ("Intervencao", [
                "Foi necessario substituir pecas? Quais?",
                "Foi feito reparo ou ajuste?",
                "Houve necessidade de modificacao no sistema?",
            ]),
            ("Validacao", [
                "O problema foi resolvido completamente?",
                "O equipamento voltou a operar dentro do padrao?",
                "Foram realizados testes finais?",
            ]),
            ("Finalizacao", [
                "Cliente aprovou o servico?",
                "Ha recomendacoes para evitar reincidencia?",
                "Foi sugerida manutencao preventiva?",
            ]),
        ],
    },
    {
        "tipo_servico": "eletrica",
        "nome": "Checklist - Manutencao preventiva eletrica",
        "descricao": "Inspecao preventiva de quadros, conexoes, medicoes, protecoes e infraestrutura eletrica.",
        "secoes": [
            ("Quadros eletricos", [
                "O quadro esta limpo e sem poeira?",
                "Ha sinais de aquecimento ou queima?",
                "Disjuntores estao funcionando corretamente?",
                "Ha identificacao correta dos circuitos?",
            ]),
            ("Conexoes", [
                "Terminais estao bem apertados?",
                "Existem cabos com isolamento danificado?",
                "Ha sinais de oxidacao ou corrosao?",
            ]),
            ("Medicoes", [
                "Tensao esta dentro do padrao?",
                "Corrente esta dentro da capacidade do circuito?",
                "Ha desequilibrio de fases?",
                "Foi verificado fator de potencia?",
            ]),
            ("Protecao", [
                "Sistema de aterramento esta adequado?",
                "DPS esta funcional?",
                "Dispositivos DR estao operando corretamente?",
            ]),
            ("Infraestrutura", [
                "Eletrodutos estao integros?",
                "Ha sobrecarga em circuitos?",
                "Instalacao segue normas aplicaveis (ABNT / NBR 5410)?",
            ]),
            ("Finalizacao", [
                "Foi feita limpeza do quadro?",
                "Foi emitido relatorio tecnico?",
                "Ha recomendacoes de melhoria?",
            ]),
        ],
    },
    {
        "tipo_servico": "refrigeracao",
        "nome": "Checklist - Manutencao preventiva ar condicionado",
        "descricao": "Inspecao preventiva de evaporadora, condensadora, sistema frigorifico, eletrica, drenagem e desempenho.",
        "secoes": [
            ("Unidade evaporadora", [
                "Filtros estao limpos?",
                "Serpentina esta suja ou obstruida?",
                "Ventilador esta operando corretamente?",
                "Ha ruido anormal?",
            ]),
            ("Unidade condensadora", [
                "Condensador esta limpo?",
                "Ventoinha esta funcionando normalmente?",
                "Ha obstrucao de fluxo de ar?",
            ]),
            ("Sistema frigorifico", [
                "Pressoes estao dentro do padrao?",
                "Ha sinais de vazamento de gas?",
                "Tubulacoes estao isoladas corretamente?",
            ]),
            ("Parte eletrica", [
                "Conexoes estao firmes?",
                "Capacitores estao dentro da especificacao?",
                "Contator esta funcionando corretamente?",
            ]),
            ("Drenagem", [
                "Dreno esta desobstruido?",
                "Ha vazamento de agua?",
                "Bandeja esta limpa?",
            ]),
            ("Desempenho", [
                "Equipamento esta refrigerando corretamente?",
                "Diferenca de temperatura esta adequada?",
                "Tempo de resposta esta normal?",
            ]),
            ("Finalizacao", [
                "Foi feita higienizacao completa?",
                "Cliente orientado sobre uso correto?",
                "Proxima manutencao agendada?",
            ]),
        ],
    },
    {
        "tipo_servico": "hvac",
        "nome": "Checklist - Manutencao preventiva HVAC",
        "descricao": "Checklist equivalente ao preventivo de ar condicionado para equipamentos HVAC.",
        "secoes": [
            ("Unidade evaporadora", [
                "Filtros estao limpos?",
                "Serpentina esta suja ou obstruida?",
                "Ventilador esta operando corretamente?",
                "Ha ruido anormal?",
            ]),
            ("Unidade condensadora", [
                "Condensador esta limpo?",
                "Ventoinha esta funcionando normalmente?",
                "Ha obstrucao de fluxo de ar?",
            ]),
            ("Sistema frigorifico", [
                "Pressoes estao dentro do padrao?",
                "Ha sinais de vazamento de gas?",
                "Tubulacoes estao isoladas corretamente?",
            ]),
            ("Parte eletrica", [
                "Conexoes estao firmes?",
                "Capacitores estao dentro da especificacao?",
                "Contator esta funcionando corretamente?",
            ]),
            ("Drenagem", [
                "Dreno esta desobstruido?",
                "Ha vazamento de agua?",
                "Bandeja esta limpa?",
            ]),
            ("Desempenho", [
                "Equipamento esta refrigerando corretamente?",
                "Diferenca de temperatura esta adequada?",
                "Tempo de resposta esta normal?",
            ]),
            ("Finalizacao", [
                "Foi feita higienizacao completa?",
                "Cliente orientado sobre uso correto?",
                "Proxima manutencao agendada?",
            ]),
        ],
    },
    {
        "tipo_servico": "civil",
        "nome": "Checklist - Manutencao civil",
        "descricao": "Inspecao de estrutura, revestimentos, cobertura, hidraulica, esquadrias, seguranca e finalizacao.",
        "secoes": [
            ("Estrutural", [
                "Ha trincas ou fissuras?",
                "Existe infiltracao?",
                "Ha sinais de recalque ou deformacao?",
            ]),
            ("Revestimentos", [
                "Azulejos ou pisos estao soltos?",
                "Pintura apresenta descascamento?",
                "Ha umidade nas paredes?",
            ]),
            ("Cobertura", [
                "Telhado apresenta vazamentos?",
                "Calhas estao limpas?",
                "Ha telhas quebradas?",
            ]),
            ("Instalacoes hidraulicas", [
                "Ha vazamentos aparentes?",
                "Pressao da agua esta adequada?",
                "Ralos estao funcionando corretamente?",
            ]),
            ("Esquadrias", [
                "Portas e janelas abrem corretamente?",
                "Ha folgas ou desalinhamento?",
                "Vedacao esta eficiente?",
            ]),
            ("Seguranca", [
                "Corrimaos e guarda-corpos estao firmes?",
                "Areas apresentam risco de queda?",
                "Ha necessidade de reparos urgentes?",
            ]),
            ("Finalizacao", [
                "Foi feito registro fotografico?",
                "Cliente aprovou as condicoes?",
                "Foram indicadas correcoes futuras?",
            ]),
        ],
    },
]


def criar_checklists(apps, schema_editor):
    ChecklistTemplate = apps.get_model("ordens", "ChecklistTemplate")
    ChecklistItem = apps.get_model("ordens", "ChecklistItem")

    for checklist in CHECKLISTS:
        template, _ = ChecklistTemplate.objects.update_or_create(
            tipo_servico=checklist["tipo_servico"],
            nome=checklist["nome"],
            defaults={
                "descricao": checklist["descricao"],
                "ativo": True,
            },
        )
        ChecklistItem.objects.filter(template=template).delete()
        ordem = 1
        for secao, perguntas in checklist["secoes"]:
            for pergunta in perguntas:
                tipo_resposta = "multiplo"
                if pergunta.lower().startswith(("qual", "quando", "quais")):
                    tipo_resposta = "texto"
                ChecklistItem.objects.create(
                    template=template,
                    texto=pergunta,
                    descricao_complementar=secao,
                    tipo_resposta=tipo_resposta,
                    obrigatorio=True,
                    ordem=ordem,
                )
                ordem += 1


def remover_checklists(apps, schema_editor):
    ChecklistTemplate = apps.get_model("ordens", "ChecklistTemplate")
    nomes = [checklist["nome"] for checklist in CHECKLISTS]
    ChecklistTemplate.objects.filter(nome__in=nomes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("ordens", "0009_faturamento_avancado"),
    ]

    operations = [
        migrations.RunPython(criar_checklists, remover_checklists),
    ]
