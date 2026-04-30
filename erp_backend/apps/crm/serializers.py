from rest_framework import serializers

from .models import (
    AnexoCRM,
    AtividadeCRM,
    ColunaPipeline,
    EmailCRM,
    Oportunidade,
    Pipeline,
    TagCRM,
)


class TagCRMSerializer(serializers.ModelSerializer):
    class Meta:
        model = TagCRM
        fields = "__all__"


class ColunaPipelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ColunaPipeline
        fields = "__all__"
        read_only_fields = ["pipeline"]


class PipelineSerializer(serializers.ModelSerializer):
    colunas = ColunaPipelineSerializer(many=True, required=False)
    criado_por_nome = serializers.CharField(source="criado_por.nome_completo", read_only=True)

    class Meta:
        model = Pipeline
        fields = "__all__"
        read_only_fields = ["criado_por", "criado_em"]

    def create(self, validated_data):
        colunas_data = validated_data.pop("colunas", [])
        request = self.context.get("request")
        usuario = request.user if request and request.user.is_authenticated else None
        pipeline = Pipeline.objects.create(criado_por=usuario, **validated_data)
        for coluna in colunas_data:
            ColunaPipeline.objects.create(pipeline=pipeline, **coluna)
        return pipeline

    def update(self, instance, validated_data):
        colunas_data = validated_data.pop("colunas", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if colunas_data is not None:
            instance.colunas.all().delete()
            for coluna in colunas_data:
                ColunaPipeline.objects.create(pipeline=instance, **coluna)
        return instance


class AnexoCRMSerializer(serializers.ModelSerializer):
    enviado_por_nome = serializers.CharField(source="enviado_por.nome_completo", read_only=True)

    class Meta:
        model = AnexoCRM
        fields = "__all__"
        read_only_fields = ["enviado_por", "enviado_em"]


class AtividadeCRMSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source="usuario.nome_completo", read_only=True)

    class Meta:
        model = AtividadeCRM
        fields = "__all__"
        read_only_fields = ["usuario", "criado_em"]


class EmailCRMSerializer(serializers.ModelSerializer):
    enviado_por_nome = serializers.CharField(source="enviado_por.nome_completo", read_only=True)

    class Meta:
        model = EmailCRM
        fields = "__all__"
        read_only_fields = ["enviado_por", "enviado_em", "status"]


class OportunidadeSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)
    contato_nome = serializers.CharField(source="contato.nome", read_only=True)
    pipeline_nome = serializers.CharField(source="pipeline.nome", read_only=True)
    coluna_nome = serializers.CharField(source="coluna.nome", read_only=True)
    responsavel_nome = serializers.CharField(source="responsavel.nome_completo", read_only=True)
    tags_detalhes = TagCRMSerializer(source="tags", many=True, read_only=True)
    atividades = AtividadeCRMSerializer(many=True, read_only=True)
    emails = EmailCRMSerializer(many=True, read_only=True)
    anexos = AnexoCRMSerializer(many=True, read_only=True)

    class Meta:
        model = Oportunidade
        fields = "__all__"
        read_only_fields = ["criado_em", "atualizado_em"]


class MoverOportunidadeSerializer(serializers.Serializer):
    coluna = serializers.PrimaryKeyRelatedField(queryset=ColunaPipeline.objects.all())
    ordem_no_kanban = serializers.IntegerField(required=False, min_value=0)


class EnviarEmailCRMSerializer(serializers.Serializer):
    assunto = serializers.CharField(max_length=255)
    corpo = serializers.CharField()
    destinatario_nome = serializers.CharField(max_length=150, required=False, allow_blank=True)
    destinatario_email = serializers.EmailField()
