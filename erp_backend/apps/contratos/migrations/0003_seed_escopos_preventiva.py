from django.db import migrations


ESCOPOS = [
    ("HVAC", "Ar Condicionado", "snowflake", "#3B82F6", "Manutenção preventiva de sistemas de climatização e ventilação.", "ABNT NBR 13971 / NBR 16401", 1),
    ("ELE", "Elétrica", "bolt", "#F59E0B", "Inspeções e medições em instalações elétricas de baixa tensão.", "ABNT NBR 5410", 2),
    ("HID", "Hidráulica", "droplet", "#0EA5E9", "Manutenção preventiva de redes hidráulicas, bombas e reservatórios.", "ABNT NBR 5626", 3),
    ("CIV", "Civil", "home-repair-service", "#64748B", "Inspeções prediais, telhados, vedações, esquadrias e elementos civis.", "ABNT NBR 16747", 4),
    ("REF", "Refrigeração Comercial", "ac-unit", "#10B981", "Manutenção preventiva em câmaras frias, balcões refrigerados e sistemas comerciais.", "ABNT NBR 16069 / boas práticas PMOC", 5),
    ("INC", "Incêndio", "local-fire-department", "#EF4444", "Inspeção preventiva de combate a incêndio, extintores, hidrantes e sinalização.", "ABNT NBR 12693 / NBR 13714 / IT Corpo de Bombeiros", 6),
    ("CFTV", "CFTV", "videocam", "#8B5CF6", "Manutenção preventiva de câmeras, DVR/NVR, rede e gravação de imagens.", "Boas práticas de segurança eletrônica", 7),
    ("PEN", "Porta de Enrolar", "door-sliding", "#14B8A6", "Manutenção preventiva de portas de enrolar manuais, automáticas e industriais.", "Boas práticas de manutenção mecânica e segurança operacional", 8),
]


CHECKLISTS = {
    "HVAC": [
        ("Filtros limpos", "limpeza", True, False, ""),
        ("Serpentina evaporadora limpa", "limpeza", True, False, ""),
        ("Serpentina condensadora limpa", "limpeza", True, False, ""),
        ("Bandeja de dreno limpa", "limpeza", True, False, ""),
        ("Dreno desobstruído", "verificacao", False, False, ""),
        ("Ventiladores funcionando", "teste", False, False, ""),
        ("Compressor funcionando", "teste", False, False, ""),
        ("Sem vazamento de gás refrigerante", "verificacao", False, False, ""),
        ("Sem vazamento de água", "verificacao", False, False, ""),
        ("Isolamento térmico em bom estado", "inspecao", False, False, ""),
        ("Corrente elétrica dentro do padrão", "medicao", False, True, "A"),
        ("Tensão elétrica dentro do padrão", "medicao", False, True, "V"),
        ("Capacitores em bom estado", "verificacao", False, False, ""),
        ("Contatores e relés em bom estado", "verificacao", False, False, ""),
        ("Conexões elétricas reapertadas", "verificacao", False, False, ""),
        ("Controle ou termostato funcionando", "teste", False, False, ""),
        ("Temperatura de insuflamento registrada", "medicao", False, True, "°C"),
        ("Temperatura de retorno registrada", "medicao", False, True, "°C"),
        ("Pressões de operação registradas", "medicao", False, True, "kPa"),
        ("Teste final realizado", "teste", False, False, ""),
    ],
    "REF": [
        ("Temperatura interna registrada", "medicao", False, True, "°C"),
        ("Setpoint conferido", "verificacao", False, False, ""),
        ("Controlador funcionando", "teste", False, False, ""),
        ("Sensores funcionando", "teste", False, False, ""),
        ("Degelo funcionando", "teste", False, False, ""),
        ("Evaporadora limpa", "limpeza", True, False, ""),
        ("Condensadora limpa", "limpeza", True, False, ""),
        ("Ventiladores da evaporadora funcionando", "teste", False, False, ""),
        ("Ventiladores da condensadora funcionando", "teste", False, False, ""),
        ("Sem excesso de gelo", "verificacao", True, False, ""),
        ("Dreno desobstruído", "verificacao", False, False, ""),
        ("Sem vazamento de fluido refrigerante", "verificacao", False, False, ""),
        ("Sem vazamento de óleo", "verificacao", False, False, ""),
        ("Compressor funcionando normalmente", "teste", False, False, ""),
        ("Corrente do compressor registrada", "medicao", False, True, "A"),
        ("Pressão de sucção registrada", "medicao", False, True, "kPa"),
        ("Pressão de descarga registrada", "medicao", False, True, "kPa"),
        ("Borrachas de vedação em bom estado", "inspecao", False, False, ""),
        ("Portas fechando corretamente", "teste", False, False, ""),
        ("Teste final realizado", "teste", False, False, ""),
    ],
    "ELE": [
        ("Quadro elétrico identificado", "inspecao", True, False, ""),
        ("Circuitos identificados", "inspecao", False, False, ""),
        ("Ausência de aquecimento anormal", "verificacao", False, False, ""),
        ("Ausência de cheiro de queimado", "verificacao", False, False, ""),
        ("Ausência de cabos danificados", "inspecao", False, False, ""),
        ("Disjuntores em bom estado", "inspecao", False, False, ""),
        ("Contatores em bom estado", "inspecao", False, False, ""),
        ("Relés em bom estado", "inspecao", False, False, ""),
        ("Bornes e terminais reapertados", "verificacao", False, False, ""),
        ("Tensão fase-fase registrada", "medicao", False, True, "V"),
        ("Tensão fase-neutro registrada", "medicao", False, True, "V"),
        ("Corrente por fase registrada", "medicao", False, True, "A"),
        ("Cargas balanceadas", "verificacao", False, False, ""),
        ("Aterramento verificado", "teste", False, False, ""),
        ("DR testado, quando aplicável", "teste", False, False, ""),
        ("DPS em bom estado, quando aplicável", "inspecao", False, False, ""),
        ("Tomadas em bom estado", "inspecao", False, False, ""),
        ("Iluminação funcionando", "teste", False, False, ""),
        ("Painel limpo e sem umidade", "limpeza", True, False, ""),
        ("Risco elétrico registrado, se houver", "inspecao", False, False, ""),
    ],
    "CIV": [
        ("Paredes sem trincas aparentes", "inspecao", False, False, ""),
        ("Paredes sem infiltração", "inspecao", True, False, ""),
        ("Piso em bom estado", "inspecao", False, False, ""),
        ("Forro em bom estado", "inspecao", False, False, ""),
        ("Telhado em bom estado", "inspecao", True, False, ""),
        ("Calhas limpas e desobstruídas", "limpeza", True, False, ""),
        ("Rufos e vedações em bom estado", "inspecao", True, False, ""),
        ("Portas em bom estado", "inspecao", False, False, ""),
        ("Janelas em bom estado", "inspecao", False, False, ""),
        ("Fechaduras funcionando", "teste", False, False, ""),
        ("Dobradiças em bom estado", "inspecao", False, False, ""),
        ("Pintura em bom estado", "inspecao", False, False, ""),
        ("Bases dos equipamentos em bom estado", "inspecao", False, False, ""),
        ("Suportes e fixações em bom estado", "verificacao", False, False, ""),
        ("Ausência de corrosão aparente", "inspecao", True, False, ""),
        ("Área técnica limpa", "limpeza", False, False, ""),
        ("Acesso seguro aos equipamentos", "verificacao", False, False, ""),
        ("Ausência de risco de queda ou tropeço", "verificacao", False, False, ""),
        ("Sinalização adequada", "inspecao", False, False, ""),
        ("Fotos anexadas, quando necessário", "inspecao", True, False, ""),
    ],
    "PEN": [
        ("Porta abre normalmente", "teste", False, False, ""),
        ("Porta fecha normalmente", "teste", False, False, ""),
        ("Sem travamentos", "verificacao", False, False, ""),
        ("Sem ruídos anormais", "verificacao", False, False, ""),
        ("Guias laterais em bom estado", "inspecao", True, False, ""),
        ("Folha alinhada", "verificacao", False, False, ""),
        ("Lâminas em bom estado", "inspecao", True, False, ""),
        ("Eixo em bom estado", "inspecao", False, False, ""),
        ("Molas em bom estado", "inspecao", False, False, ""),
        ("Suportes fixados corretamente", "verificacao", False, False, ""),
        ("Parafusos e chumbadores conferidos", "verificacao", False, False, ""),
        ("Pontos móveis lubrificados", "lubrificacao", False, False, ""),
        ("Motor funcionando, se aplicável", "teste", False, False, ""),
        ("Central de comando funcionando", "teste", False, False, ""),
        ("Botoeira funcionando", "teste", False, False, ""),
        ("Controle remoto funcionando", "teste", False, False, ""),
        ("Fim de curso regulado", "ajuste", False, False, ""),
        ("Sistema manual de emergência funcionando", "teste", False, False, ""),
        ("Sensores de segurança funcionando", "teste", False, False, ""),
        ("Teste final realizado", "teste", False, False, ""),
    ],
}


def seed_preventiva(apps, schema_editor):
    EscopoTecnico = apps.get_model("contratos", "EscopoTecnico")
    ItemChecklistPadrao = apps.get_model("contratos", "ItemChecklistPadrao")

    escopos_por_codigo = {}
    for codigo, nome, icone, cor, descricao, norma, ordem in ESCOPOS:
        escopo, _ = EscopoTecnico.objects.update_or_create(
            codigo=codigo,
            defaults={
                "nome": nome,
                "icone": icone,
                "cor": cor,
                "descricao": descricao,
                "norma_tecnica": norma,
                "ativo": True,
                "ordem": ordem,
            },
        )
        escopos_por_codigo[codigo] = escopo

    for codigo, itens in CHECKLISTS.items():
        escopo = escopos_por_codigo[codigo]
        for ordem, (descricao, categoria, requer_foto, requer_medicao, unidade_medicao) in enumerate(itens, start=1):
            ItemChecklistPadrao.objects.update_or_create(
                escopo=escopo,
                descricao=descricao,
                defaults={
                    "categoria": categoria,
                    "obrigatorio": True,
                    "requer_foto": requer_foto,
                    "requer_medicao": requer_medicao,
                    "unidade_medicao": unidade_medicao,
                    "ordem": ordem,
                    "referencia_norma": escopo.norma_tecnica,
                    "ativo": True,
                },
            )


class Migration(migrations.Migration):
    dependencies = [
        ("contratos", "0002_alter_execucaochecklist_status"),
    ]

    operations = [
        migrations.RunPython(seed_preventiva, migrations.RunPython.noop),
    ]
