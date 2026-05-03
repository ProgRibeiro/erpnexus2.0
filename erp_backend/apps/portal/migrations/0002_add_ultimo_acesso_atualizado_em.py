# Generated migration file for portal app

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuarioportal',
            name='ultimo_acesso',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='usuarioportal',
            name='atualizado_em',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
