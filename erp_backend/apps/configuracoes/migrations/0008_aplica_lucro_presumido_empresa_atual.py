from django.db import migrations


def aplicar_lucro_presumido(apps, schema_editor):
    ConfiguracaoEmpresa = apps.get_model("configuracoes", "ConfiguracaoEmpresa")
    ConfiguracaoFiscal = apps.get_model("fiscal", "ConfiguracaoFiscal")

    empresas = ConfiguracaoEmpresa.objects.filter(cnpj__gt="")
    for empresa in empresas:
        if empresa.regime_tributario in ("", "simples_nacional"):
            empresa.regime_tributario = "lucro_presumido"
            empresa.save(update_fields=["regime_tributario"])

        ConfiguracaoFiscal.objects.filter(empresa_id=empresa.id).update(
            regime_tributario="lucro_presumido",
            tipo_nota="nfse",
        )


def reverter(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("configuracoes", "0007_alter_configuracaoempresa_regime_tributario"),
        ("fiscal", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(aplicar_lucro_presumido, reverter),
    ]
