from rest_framework import serializers

from .models import Cliente, ContatoCliente, EnderecoCliente, HistoricoCliente


class EnderecoClienteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = EnderecoCliente
        fields = "__all__"
        read_only_fields = ["cliente"]


class ContatoClienteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ContatoCliente
        fields = "__all__"
        read_only_fields = ["cliente"]


class HistoricoClienteSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source="usuario.nome_completo", read_only=True)

    class Meta:
        model = HistoricoCliente
        fields = "__all__"
        read_only_fields = ["usuario", "criado_em"]


class ClienteSerializer(serializers.ModelSerializer):
    enderecos = EnderecoClienteSerializer(many=True, required=False)
    contatos = ContatoClienteSerializer(many=True, required=False)
    historicos = HistoricoClienteSerializer(many=True, read_only=True)

    class Meta:
        model = Cliente
        fields = "__all__"

    def create(self, validated_data):
        enderecos_data = validated_data.pop("enderecos", [])
        contatos_data = validated_data.pop("contatos", [])
        cliente = Cliente.objects.create(**validated_data)
        self._salvar_enderecos(cliente, enderecos_data)
        self._salvar_contatos(cliente, contatos_data)
        return cliente

    def update(self, instance, validated_data):
        enderecos_data = validated_data.pop("enderecos", None)
        contatos_data = validated_data.pop("contatos", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if enderecos_data is not None:
            instance.enderecos.all().delete()
            self._salvar_enderecos(instance, enderecos_data)
        if contatos_data is not None:
            instance.contatos.all().delete()
            self._salvar_contatos(instance, contatos_data)

        return instance

    def _salvar_enderecos(self, cliente, enderecos_data):
        for endereco in enderecos_data:
            endereco.pop("id", None)
            EnderecoCliente.objects.create(cliente=cliente, **endereco)

    def _salvar_contatos(self, cliente, contatos_data):
        for contato in contatos_data:
            contato.pop("id", None)
            ContatoCliente.objects.create(cliente=cliente, **contato)
