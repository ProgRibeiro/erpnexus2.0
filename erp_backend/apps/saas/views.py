"""
Views CRUD para gerenciamento das configurações do SaaS Facilities.
Usadas pela página de Configurações do Facilities no frontend.
"""
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Tenant, PlanoSaaS, Empresa, Unidade, NivelAprovacao,
    AprovadorAlcada, CentroCusto, PrestadorContratado,
    CategoriaBudget, ContratoSaaS,
)
from .serializers import (
    TenantSerializer, PlanoSaaSSerializer, EmpresaSerializer,
    UnidadeSerializer, NivelAprovacaoSerializer, AprovadorAlcadaSerializer,
    CentroCustoSerializer, PrestadorContratadoSerializer,
    CategoriaBudgetSerializer, ContratoSaaSSerializer,
)


# ── Tenant ────────────────────────────────────────────────────────────────────

class TenantListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TenantSerializer

    def get_queryset(self):
        return Tenant.objects.filter(ativo=True).order_by("-criado_em")


class TenantDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TenantSerializer
    queryset = Tenant.objects.all()

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save()


# ── Plano SaaS ────────────────────────────────────────────────────────────────

class PlanoSaaSListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PlanoSaaSSerializer
    queryset = PlanoSaaS.objects.filter(ativo=True).order_by("valor_mensal")


# ── Empresa (hierarquia multi-empresa) ───────────────────────────────────────

class EmpresaListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmpresaSerializer

    def get_queryset(self):
        qs = Empresa.objects.filter(ativo=True).select_related("tenant", "empresa_pai")
        tenant_id = self.request.query_params.get("tenant")
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs.order_by("nivel_hierarquia", "nome")


class EmpresaDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmpresaSerializer
    queryset = Empresa.objects.all()

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save()


# ── Unidade ───────────────────────────────────────────────────────────────────

class UnidadeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UnidadeSerializer

    def get_queryset(self):
        qs = Unidade.objects.filter(ativo=True).select_related("empresa")
        empresa_id = self.request.query_params.get("empresa")
        tipo = self.request.query_params.get("tipo")
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        if tipo:
            qs = qs.filter(tipo=tipo)
        return qs.order_by("codigo_interno")


class UnidadeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UnidadeSerializer
    queryset = Unidade.objects.all()

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save()


# ── Nível de Aprovação ────────────────────────────────────────────────────────

class NivelAprovacaoListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NivelAprovacaoSerializer

    def get_queryset(self):
        qs = NivelAprovacao.objects.all().select_related("tenant")
        tenant_id = self.request.query_params.get("tenant")
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs.order_by("ordem")


class NivelAprovacaoDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NivelAprovacaoSerializer
    queryset = NivelAprovacao.objects.all()


# ── Centro de Custo ───────────────────────────────────────────────────────────

class CentroCustoListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CentroCustoSerializer

    def get_queryset(self):
        qs = CentroCusto.objects.filter(ativo=True).select_related("empresa")
        empresa_id = self.request.query_params.get("empresa")
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs.order_by("codigo")


class CentroCustoDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CentroCustoSerializer
    queryset = CentroCusto.objects.all()

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save()


# ── Prestador Contratado ──────────────────────────────────────────────────────

class PrestadorContratadoListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PrestadorContratadoSerializer

    def get_queryset(self):
        qs = PrestadorContratado.objects.filter(ativo=True).select_related(
            "tenant_contratante", "tenant_prestador"
        )
        tenant_id = self.request.query_params.get("tenant")
        if tenant_id:
            qs = qs.filter(tenant_contratante_id=tenant_id)
        return qs.order_by("tenant_prestador__nome")


class PrestadorContratadoDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PrestadorContratadoSerializer
    queryset = PrestadorContratado.objects.all()

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save()


# ── Categoria Budget ──────────────────────────────────────────────────────────

class CategoriaBudgetListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CategoriaBudgetSerializer
    queryset = CategoriaBudget.objects.filter(ativo=True).order_by("nome")


class CategoriaBudgetDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CategoriaBudgetSerializer
    queryset = CategoriaBudget.objects.all()


# ── Contrato SaaS ─────────────────────────────────────────────────────────────

class ContratoSaaSListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContratoSaaSSerializer

    def get_queryset(self):
        return ContratoSaaS.objects.select_related("tenant").order_by("-inicio")


class ContratoSaaSDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContratoSaaSSerializer
    queryset = ContratoSaaS.objects.all()


# ── Aprovador de Alçada ───────────────────────────────────────────────────────

class AprovadorAlcadaListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AprovadorAlcadaSerializer

    def get_queryset(self):
        qs = AprovadorAlcada.objects.filter(ativo=True).select_related("nivel", "usuario")
        nivel_id = self.request.query_params.get("nivel")
        if nivel_id:
            qs = qs.filter(nivel_id=nivel_id)
        return qs


class AprovadorAlcadaDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AprovadorAlcadaSerializer
    queryset = AprovadorAlcada.objects.all()

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save()
