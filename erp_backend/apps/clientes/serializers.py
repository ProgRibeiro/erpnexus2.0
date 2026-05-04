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
    cliente_principal_nome = serializers.CharField(source="cliente_principal.nome", read_only=True)
    cliente_principal_cnpj = serializers.CharField(source="cliente_principal.cnpj_cpf", read_only=True)
    cep = serializers.CharField(write_only=True, required=False, allow_blank=True)
    logradouro = serializers.CharField(write_only=True, required=False, allow_blank=True)
    numero = serializers.CharField(write_only=True, required=False, allow_blank=True)
    complemento = serializers.CharField(write_only=True, required=False, allow_blank=True)
    bairro = serializers.CharField(write_only=True, required=False, allow_blank=True)
    cidade = serializers.CharField(write_only=True, required=False, allow_blank=True)
    uf = serializers.CharField(write_only=True, required=False, allow_blank=True)
    endereco_principal = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = "__all__"
        extra_kwargs = {
            "nome": {"required": False, "allow_blank": True},
        }

    def create(self, validated_data):
        endereco_flat = self._extrair_endereco_flat(validated_data)
        enderecos_data = validated_data.pop("enderecos", [])
        contatos_data = validated_data.pop("contatos", [])
        self._normalizar_cliente(validated_data)
        if endereco_flat:
            enderecos_data.append(endereco_flat)
        cliente = Cliente.objects.create(**validated_data)
        self._salvar_enderecos(cliente, enderecos_data)
        self._salvar_contatos(cliente, contatos_data)
        return cliente

    def update(self, instance, validated_data):
        endereco_flat = self._extrair_endereco_flat(validated_data)
        enderecos_data = validated_data.pop("enderecos", None)
        contatos_data = validated_data.pop("contatos", None)
        self._normalizar_cliente(validated_data)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if endereco_flat:
            enderecos_data = [endereco_flat]

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

    def _normalizar_cliente(self, validated_data):
        nome_fantasia = validated_data.get("nome_fantasia")
        razao_social = validated_data.get("razao_social")
        if nome_fantasia:
            validated_data["nome"] = nome_fantasia
        elif razao_social and not validated_data.get("nome"):
            validated_data["nome"] = razao_social

        cliente_principal = validated_data.get("cliente_principal")
        if cliente_principal:
            validated_data["cnpj_principal_grupo"] = cliente_principal.cnpj_cpf

    def _extrair_endereco_flat(self, validated_data):
        keys = ["cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf"]
        data = {key: validated_data.pop(key, "") for key in keys}
        if not any(data.values()):
            return None
        if not data.get("logradouro") or not data.get("cidade") or not data.get("uf"):
            return None
        return {
            "tipo": EnderecoCliente.Tipo.SERVICO,
            "cep": data.get("cep", ""),
            "logradouro": data.get("logradouro", ""),
            "numero": data.get("numero", ""),
            "complemento": data.get("complemento", ""),
            "bairro": data.get("bairro", ""),
            "cidade": data.get("cidade", ""),
            "estado": data.get("uf", ""),
            "principal": True,
        }

    def get_endereco_principal(self, obj):
        endereco = obj.enderecos.filter(principal=True).first() or obj.enderecos.first()
        if not endereco:
            return None
        return EnderecoClienteSerializer(endereco).data
