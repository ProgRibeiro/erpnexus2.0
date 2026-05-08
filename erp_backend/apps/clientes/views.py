from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework import viewsets

from apps.auditoria.mixins import AuditMixin

from .models import Cliente
from .serializers import ClienteSerializer


class ClienteViewSet(AuditMixin, viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
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
            busca_digits = "".join(filter(str.isdigit, str(busca)))
            filtro_busca = (
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
            )
            if busca_digits:
                filtro_busca |= Q(cnpj_cpf__icontains=busca_digits) | Q(cnpj_principal_grupo__icontains=busca_digits)
            queryset = queryset.filter(filtro_busca).distinct()
        if cnpj_cpf:
            cnpj_digits = "".join(filter(str.isdigit, str(cnpj_cpf)))
            queryset = queryset.filter(cnpj_cpf__icontains=cnpj_digits or cnpj_cpf)

        return queryset
