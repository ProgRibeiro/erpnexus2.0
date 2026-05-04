from django.db import migrations


CATEGORIAS_PADRAO = [
    ("Refrigeração", "Peças, insumos e componentes para refrigeração comercial e industrial."),
    ("Ar condicionado / HVAC", "Produtos usados em instalação, manutenção e operação de sistemas HVAC."),
    ("Elétrica", "Materiais elétricos, proteção, comandos, cabos e componentes de quadros."),
    ("Civil", "Materiais de manutenção predial, acabamento e pequenos reparos civis."),
    ("Ferramentas e consumíveis", "Ferramentas, brocas, discos, EPIs e consumíveis operacionais."),
    ("Produtos sob compra", "Itens futuros comprados sob demanda para OS específicas."),
]


def criar_categorias(apps, schema_editor):
    CategoriaProduto = apps.get_model("estoque", "CategoriaProduto")
    for nome, descricao in CATEGORIAS_PADRAO:
        CategoriaProduto.objects.get_or_create(
            nome=nome,
            defaults={"descricao": descricao, "ativo": True},
        )


def reverter(apps, schema_editor):
    CategoriaProduto = apps.get_model("estoque", "CategoriaProduto")
    CategoriaProduto.objects.filter(nome__in=[nome for nome, _ in CATEGORIAS_PADRAO]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("estoque", "0005_produto_aliquota_impostos_percentual_and_more"),
    ]

    operations = [
        migrations.RunPython(criar_categorias, reverter),
    ]
