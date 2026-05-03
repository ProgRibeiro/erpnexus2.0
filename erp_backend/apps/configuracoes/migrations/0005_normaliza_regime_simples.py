from django.db import migrations


def forwards(apps, schema_editor):
    ConfiguracaoEmpresa = apps.get_model("configuracoes", "ConfiguracaoEmpresa")
    ConfiguracaoEmpresa.objects.filter(regime_tributario="simples").update(
        regime_tributario="simples_nacional"
    )


def backwards(apps, schema_editor):
    ConfiguracaoEmpresa = apps.get_model("configuracoes", "ConfiguracaoEmpresa")
    ConfiguracaoEmpresa.objects.filter(regime_tributario="simples_nacional").update(
        regime_tributario="simples"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("configuracoes", "0004_regime_tributario_empresa"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
