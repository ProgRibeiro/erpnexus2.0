from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Client
from .serializers import DiretorioPrestadorSerializer


class DiretorioPrestadoresView(APIView):
    """
    Endpoint PÚBLICO — Facilities busca prestadores ERP neste diretório.
    Retorna apenas dados públicos (nome, especialidades, cidade).
    Prestadores NÃO acessam dados de Facilities por aqui.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        qs = Client.objects.filter(
            tipo_produto__in=['erp', 'ambos'],
            visivel_no_diretorio=True,
            status='ativo'
        )
        especialidade = request.query_params.get('especialidade')
        cidade = request.query_params.get('cidade')
        estado = request.query_params.get('estado')
        if especialidade:
            qs = qs.filter(especialidades__contains=[especialidade])
        if cidade:
            qs = qs.filter(cidade__icontains=cidade)
        if estado:
            qs = qs.filter(estado=estado)
        return Response(DiretorioPrestadorSerializer(qs, many=True).data)
