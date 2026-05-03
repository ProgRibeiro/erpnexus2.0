from rest_framework import serializers
from .models import UsuarioPortal


class PortalLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    senha = serializers.CharField(write_only=True)


class UsuarioPortalSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)

    class Meta:
        model = UsuarioPortal
        fields = ["id", "cliente", "cliente_nome", "email", "ativo", "ultimo_acesso"]
        read_only_fields = ["id", "cliente", "ativo", "ultimo_acesso"]


class PortalOrdemResumoSerializer(serializers.Serializer):
    """Dados públicos da OS para o cliente - sem dados internos"""
    id = serializers.IntegerField()
    numero = serializers.CharField()
    status = serializers.CharField()
    data_agendada = serializers.DateField()
    tecnico_nome = serializers.SerializerMethodField()
    descricao_servico = serializers.CharField()
    valor_total_orcado = serializers.DecimalField(max_digits=10, decimal_places=2)
    valor_final_faturado = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    numero_nf = serializers.CharField(allow_blank=True)
    data_vencimento = serializers.DateField(allow_null=True)
    status_pagamento = serializers.CharField(allow_blank=True)

    def get_tecnico_nome(self, obj):
        return obj.tecnico_responsavel.nome_completo if obj.tecnico_responsavel else "Não atribuído"


class PortalOrdemDetalheSSerializer(PortalOrdemResumoSerializer):
    """Detalhes da OS para o cliente"""
    tipo_servico = serializers.CharField()
    prioridade = serializers.CharField()
    endereco_servico = serializers.CharField()
    observacoes_tecnicas = serializers.CharField()
    itens = serializers.SerializerMethodField()
    fotos_antes = serializers.SerializerMethodField()
    fotos_depois = serializers.SerializerMethodField()
    cliente_nome = serializers.SerializerMethodField()
    contato_responsavel_nome = serializers.SerializerMethodField()

    def get_itens(self, obj):
        items = obj.itens.all()
        return [{
            "descricao": item.descricao,
            "quantidade": str(item.quantidade),
            "valor_unitario": str(item.valor_unitario),
            "valor_total": str(item.valor_total)
        } for item in items]

    def get_fotos_antes(self, obj):
        fotos = obj.fotos.filter(tipo="antes")
        return [{
            "id": foto.id,
            "arquivo": foto.arquivo.url if foto.arquivo else None,
            "legenda": foto.legenda
        } for foto in fotos]

    def get_fotos_depois(self, obj):
        fotos = obj.fotos.filter(tipo="depois")
        return [{
            "id": foto.id,
            "arquivo": foto.arquivo.url if foto.arquivo else None,
            "legenda": foto.legenda
        } for foto in fotos]

    def get_cliente_nome(self, obj):
        return obj.cliente.nome

    def get_contato_responsavel_nome(self, obj):
        return obj.contato_responsavel.nome if obj.contato_responsavel else "Não informado"


class PortalOrcamentoSerializer(serializers.Serializer):
    """Orçamento pendente de aprovação do cliente"""
    id = serializers.IntegerField()
    numero = serializers.CharField()
    cliente_nome = serializers.SerializerMethodField()
    descricao_servico = serializers.CharField()
    valor_total_orcado = serializers.DecimalField(max_digits=10, decimal_places=2)
    condicao_pagamento = serializers.CharField()
    validade_orcamento = serializers.DateField()
    itens = serializers.SerializerMethodField()

    def get_cliente_nome(self, obj):
        return obj.cliente.nome

    def get_itens(self, obj):
        items = obj.itens.all()
        return [{
            "descricao": item.descricao,
            "quantidade": str(item.quantidade),
            "valor_unitario": str(item.valor_unitario),
            "valor_total": str(item.valor_total)
        } for item in items]


class PortalNotaFiscalSerializer(serializers.Serializer):
    """Nota fiscal para o cliente"""
    id = serializers.IntegerField()
    numero = serializers.CharField()
    numero_nf = serializers.CharField()
    cliente_nome = serializers.SerializerMethodField()
    data_emissao_nf = serializers.DateField()
    data_vencimento = serializers.DateField(allow_null=True)
    valor_final_faturado = serializers.DecimalField(max_digits=10, decimal_places=2)
    status_pagamento = serializers.CharField()
    pdf_nf = serializers.SerializerMethodField()

    def get_cliente_nome(self, obj):
        return obj.cliente.nome

    def get_pdf_nf(self, obj):
        return obj.pdf_nf.url if obj.pdf_nf else None
