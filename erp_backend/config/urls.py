from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from apps.ordens.views import RelatorioPublicoPDFView, RelatorioPublicoView
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
    path("publico/relatorio/<uuid:token>/", RelatorioPublicoView.as_view(), name="publico-relatorio"),
    path("publico/relatorio/<uuid:token>/pdf/", RelatorioPublicoPDFView.as_view(), name="publico-relatorio-pdf"),
    path("portal/", include("apps.portal.urls")),
    path("configuracoes/", include("apps.configuracoes.urls")),
    path("fiscal/", include("apps.fiscal.urls")),
    path("health/", HealthCheckView.as_view(), name="health-check"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_patterns)),
    re_path(r"^(?!api/|admin/|static/|media/).*$", TemplateView.as_view(template_name="index.html"), name="frontend"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
