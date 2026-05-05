from django.core.management.base import BaseCommand
from apps.saas.models import Tenant, Empresa, Unidade, PlanoSaaS, NivelAprovacao
from django.utils import timezone


class Command(BaseCommand):
    help = 'Cria dados demo para a plataforma SaaS'

    def handle(self, *args, **kwargs):
        plano = PlanoSaaS.objects.filter(pk=3).first()
        tenant, _ = Tenant.objects.get_or_create(
            nome='Hering Brasil',
            defaults={
                'razao_social': 'Cia Hering S.A.',
                'cnpj': '29.979.036/0001-87',
                'tipo': 'contratante',
                'plano': 'enterprise',
                'plano_saas': plano,
                'status': 'ativo',
                'data_inicio_contrato': timezone.now().date(),
                'valor_mensalidade': 25000,
                'limite_usuarios': 500,
                'limite_unidades': 9999,
                'limite_chamados_mes': 99999,
            }
        )
        self.stdout.write(f'Tenant: {tenant.nome}')

        matriz, _ = Empresa.objects.get_or_create(
            tenant=tenant, nome='Hering Brasil S.A.',
            defaults={'tipo': 'matriz', 'nivel_hierarquia': 1, 'cnpj': '29.979.036/0001-87'}
        )
        regional_sp, _ = Empresa.objects.get_or_create(
            tenant=tenant, nome='Hering Regional SP',
            defaults={'tipo': 'regional', 'nivel_hierarquia': 2, 'empresa_pai': matriz}
        )
        regional_rj, _ = Empresa.objects.get_or_create(
            tenant=tenant, nome='Hering Regional RJ',
            defaults={'tipo': 'regional', 'nivel_hierarquia': 2, 'empresa_pai': matriz}
        )
        self.stdout.write('Empresas criadas')

        unidades_data = [
            {'empresa': regional_sp, 'codigo_interno': 'LJ-001', 'nome': 'Hering Iguatemi SP', 'tipo': 'loja_shopping', 'cidade': 'São Paulo', 'estado': 'SP', 'area_m2': 250},
            {'empresa': regional_sp, 'codigo_interno': 'LJ-002', 'nome': 'Hering Morumbi SP', 'tipo': 'loja_shopping', 'cidade': 'São Paulo', 'estado': 'SP', 'area_m2': 180},
            {'empresa': regional_sp, 'codigo_interno': 'ESC-001', 'nome': 'Escritório SP', 'tipo': 'escritorio', 'cidade': 'São Paulo', 'estado': 'SP', 'area_m2': 800},
            {'empresa': regional_rj, 'codigo_interno': 'LJ-003', 'nome': 'Hering Barra RJ', 'tipo': 'loja_shopping', 'cidade': 'Rio de Janeiro', 'estado': 'RJ', 'area_m2': 200},
            {'empresa': regional_rj, 'codigo_interno': 'LJ-004', 'nome': 'Hering Norte Shopping RJ', 'tipo': 'loja_shopping', 'cidade': 'Rio de Janeiro', 'estado': 'RJ', 'area_m2': 160},
        ]
        for ud in unidades_data:
            area = ud.pop('area_m2')
            Unidade.objects.get_or_create(
                codigo_interno=ud['codigo_interno'],
                empresa=ud['empresa'],
                defaults={**ud, 'area_m2': area}
            )
        self.stdout.write('Unidades criadas')

        niveis = [
            {'nome': 'Coordenador', 'valor_minimo': 0, 'valor_maximo': 5000, 'ordem': 1},
            {'nome': 'Gerente', 'valor_minimo': 5000, 'valor_maximo': 30000, 'requer_3_cotacoes': True, 'ordem': 2},
            {'nome': 'Diretor', 'valor_minimo': 30000, 'valor_maximo': 100000, 'requer_3_cotacoes': True, 'ordem': 3},
            {'nome': 'Conselho', 'valor_minimo': 100000, 'valor_maximo': 9999999, 'requer_3_cotacoes': True, 'ordem': 4},
        ]
        for nd in niveis:
            NivelAprovacao.objects.get_or_create(tenant=tenant, nome=nd['nome'], defaults={**nd, 'tenant': tenant})
        self.stdout.write('Níveis de aprovação criados')

        self.stdout.write(self.style.SUCCESS('✅ Seed SaaS demo concluído!'))
