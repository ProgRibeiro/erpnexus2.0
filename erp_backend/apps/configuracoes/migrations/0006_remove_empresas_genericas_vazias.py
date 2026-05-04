from django.db import migrations


NOMES_RESERVADOS = ["ERP Nexus", "ERP Servicos", "ERP Serviços"]


def remover_empresas_genericas_vazias(apps, schema_editor):
    ConfiguracaoEmpresa = apps.get_model("configuracoes", "ConfiguracaoEmpresa")
    empresas_reais = ConfiguracaoEmpresa.objects.exclude(nome__in=NOMES_RESERVADOS).filter(
        cnpj__gt=""
    )
    if not empresas_reais.exists():
        empresas_reais = ConfiguracaoEmpresa.objects.exclude(nome__in=NOMES_RESERVADOS).filter(
            razao_social__gt=""
        )
    if not empresas_reais.exists():
        return

    ConfiguracaoEmpresa.objects.filter(
        nome__in=NOMES_RESERVADOS,
        cnpj="",
        razao_social="",
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("configuracoes", "0005_normaliza_regime_simples"),
    ]

    operations = [
        migrations.RunPython(remover_empresas_genericas_vazias, migrations.RunPython.noop),
    ]
