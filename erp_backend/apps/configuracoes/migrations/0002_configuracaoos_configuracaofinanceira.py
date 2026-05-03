# Generated migration file for ConfiguracaoOS and ConfiguracaoFinanceira

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('configuracoes', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ConfiguracaoOS',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('prefixo', models.CharField(default='OS', max_length=10)),
                ('proximo_numero', models.PositiveIntegerField(default=1000)),
                ('validade_padrao', models.PositiveIntegerField(default=30, help_text='Validade em dias')),
                ('texto_termos', models.TextField(blank=True, help_text='Texto de termos padrão para novas ordens de serviço')),
                ('texto_condicoes', models.TextField(blank=True, help_text='Texto de condições de pagamento padrão')),
                ('incluir_logo_pdf', models.BooleanField(default=True)),
                ('incluir_assinatura_pdf', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Configuracao de Ordens de Servico',
                'verbose_name_plural': 'Configuracoes de Ordens de Servico',
            },
        ),
        migrations.CreateModel(
            name='ConfiguracaoFinanceira',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('aliquota_iss', models.DecimalField(decimal_places=2, default=5.0, help_text='Alíquota padrão do ISS em percentual', max_digits=5)),
                ('conta_padrao_receber', models.CharField(blank=True, help_text='Conta padrão para recebimentos', max_length=100)),
                ('conta_padrao_pagar', models.CharField(blank=True, help_text='Conta padrão para pagamentos', max_length=100)),
                ('banco_padrao', models.CharField(blank=True, help_text='Banco padrão para movimentações', max_length=100)),
                ('agencia_padrao', models.CharField(blank=True, max_length=10)),
                ('conta_corrente_padrao', models.CharField(blank=True, max_length=20)),
                ('dias_padrao_pagamento', models.PositiveIntegerField(default=30, help_text='Dias padrão para vencimento de compras')),
                ('dias_padrao_recebimento', models.PositiveIntegerField(default=30, help_text='Dias padrão para vencimento de vendas')),
                ('juros_atraso', models.DecimalField(decimal_places=2, default=2.0, help_text='Juros mensais por atraso em percentual', max_digits=5)),
                ('multa_atraso', models.DecimalField(decimal_places=2, default=2.0, help_text='Multa por atraso em percentual', max_digits=5)),
            ],
            options={
                'verbose_name': 'Configuracao Financeira',
                'verbose_name_plural': 'Configuracoes Financeira',
            },
        ),
    ]
