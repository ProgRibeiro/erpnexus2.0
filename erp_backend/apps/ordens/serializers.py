from rest_framework import serializers

from .models import (
    AnexoChatOS,
    AssinaturaClienteOS,
    ChatOS,
    DespesaOS,
    FotoOS,
    ItemOrcamento,
    LogStatusOS,
    OrdemServico,
)


class ItemOrcamentoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ItemOrcamento
        fields = "__all__"
        read_only_fields = ["os", "valor_total"]


class FotoOSSerializer(serializers.ModelSerializer):
    enviado_por_nome = serializers.CharField(source="enviado_por.nome_completo", read_only=True)

    class Meta:
        model = FotoOS
        fields = "__all__"
        read_only_fields = ["os", "enviado_por", "enviado_em"]


class AnexoChatOSSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnexoChatOS
        fields = "__all__"
        read_only_fields = ["mensagem"]


class ChatOSSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source="usuario.nome_completo", read_only=True)
    anexos = AnexoChatOSSerializer(many=True, read_only=True)

    class Meta:
        model = ChatOS
        fields = "__all__"
        read_only_fields = ["os", "usuario", "criado_em"]


class DespesaOSSerializer(serializers.ModelSerializer):
    registrado_por_nome = serializers.CharField(
        source="registrado_por.nome_completo",
        read_only=True,
    )

    class Meta:
        model = DespesaOS
        fields = "__all__"
        read_only_fields = ["os", "registrado_por"]


class LogStatusOSSerializer(serializers.ModelSerializer):
    alterado_por_nome = serializers.CharField(source="alterado_por.nome_completo", read_only=True)

    class Meta:
        model = LogStatusOS
        fields = "__all__"
        read_only_fields = ["os", "alterado_por", "alterado_em"]


class AssinaturaClienteOSSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssinaturaClienteOS
        fields = "__all__"
        read_only_fields = ["os"]


class OrdemServicoSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)
    tecnico_nome = serializers.CharField(source="tecnico_responsavel.username", read_only=True)
    contato_nome = serializers.CharField(source="contato_responsavel.nome", read_only=True)
    endereco_servico_texto = serializers.StringRelatedField(source="endereco_servico", read_only=True)
    itens = ItemOrcamentoSerializer(many=True, required=False)
    fotos = FotoOSSerializer(many=True, read_only=True)
    mensagens = ChatOSSerializer(many=True, read_only=True)
    despesas = DespesaOSSerializer(many=True, read_only=True)
    logs_status = LogStatusOSSerializer(many=True, read_only=True)
    assinatura_cliente = AssinaturaClienteOSSerializer(read_only=True)

    class Meta:
        model = OrdemServico
        fields = "__all__"
        read_only_fields = [
            "numero",
            "valor_total_orcado",
            "criado_por",
            "criado_em",
            "atualizado_por",
            "atualizado_em",
        ]

    def create(self, validated_data):
        itens_data = validated_data.pop("itens", [])
        request = self.context.get("request")
        usuario = validated_data.pop("criado_por", None)
        usuario = usuario or (request.user if request and request.user.is_authenticated else None)
        atualizado_por = validated_data.pop("atualizado_por", None) or usuario
        ordem = OrdemServico.objects.create(
            criado_por=usuario,
            atualizado_por=atualizado_por,
            **validated_data,
        )
        self._salvar_itens(ordem, itens_data)
        return ordem

    def update(self, instance, validated_data):
        itens_data = validated_data.pop("itens", None)
        request = self.context.get("request")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if request and request.user.is_authenticated:
            instance.atualizado_por = request.user
        instance.save()

        if itens_data is not None:
            instance.itens.all().delete()
            self._salvar_itens(instance, itens_data)

        return instance

    def _salvar_itens(self, ordem, itens_data):
        for item in itens_data:
            item.pop("id", None)
            ItemOrcamento.objects.create(os=ordem, **item)


class MudarStatusOSSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrdemServico.Status.choices)
    observacao = serializers.CharField(required=False, allow_blank=True)
