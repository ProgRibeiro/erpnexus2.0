from django.db.models import Q
from rest_framework import viewsets

from apps.auditoria.mixins import AuditMixin

from .models import Cliente
from .serializers import ClienteSerializer


class ClienteViewSet(AuditMixin, viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    search_fields = [
        "nome",
        "nome_fantasia",
        "razao_social",
        "cnpj_cpf",
        "email",
        "telefone",
        "whatsapp",
        "enderecos__cidade",
        "enderecos__estado",
    ]
    filterset_fields = ["status", "segmento"]
    ordering_fields = ["nome", "criado_em", "status", "segmento"]

    def get_queryset(self):
        queryset = Cliente.objects.select_related("cliente_principal").prefetch_related("enderecos", "contatos", "historicos")
        status = self.request.query_params.get("status")
        segmento = self.request.query_params.get("segmento")
        busca = self.request.query_params.get("busca") or self.request.query_params.get("search")
        cnpj_cpf = self.request.query_params.get("cnpj") or self.request.query_params.get("cnpj_cpf")

        if status:
            queryset = queryset.filter(status=status)
        if segmento:
            queryset = queryset.filter(segmento__icontains=segmento)
        if busca:
            queryset = queryset.filter(
                Q(nome__icontains=busca)
                | Q(nome_fantasia__icontains=busca)
                | Q(razao_social__icontains=busca)
                | Q(cnpj_cpf__icontains=busca)
                | Q(email__icontains=busca)
                | Q(telefone__icontains=busca)
                | Q(whatsapp__icontains=busca)
                | Q(segmento__icontains=busca)
                | Q(enderecos__cidade__icontains=busca)
                | Q(enderecos__estado__icontains=busca)
            ).distinct()
        if cnpj_cpf:
            queryset = queryset.filter(cnpj_cpf__icontains=cnpj_cpf)

        return queryset
