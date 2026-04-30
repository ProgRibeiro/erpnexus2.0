from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "erp_backend"})


api_patterns = [
    path("auth/", include("apps.usuarios.urls")),
    path("clientes/", include("apps.clientes.urls")),
    path("ordens/", include("apps.ordens.urls")),
    path("financeiro/", include("apps.financeiro.urls")),
    path("crm/", include("apps.crm.urls")),
    path("estoque/", include("apps.estoque.urls")),
    path("relatorios/", include("apps.relatorios.urls")),
    path("health/", HealthCheckView.as_view(), name="health-check"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_patterns)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
