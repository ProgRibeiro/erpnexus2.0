from django.urls import path
from . import mobile_views

urlpatterns = [
    path('aprovacoes-pendentes/', mobile_views.MobileAprovacoesPendentesView.as_view(), name='mobile-aprovacoes'),
    path('aprovacao/<int:pk>/swipe-aprovar/', mobile_views.MobileSwipeAprovarView.as_view(), name='mobile-swipe-aprovar'),
    path('aprovacao/<int:pk>/swipe-reprovar/', mobile_views.MobileSwipeReprovarView.as_view(), name='mobile-swipe-reprovar'),
    path('dashboard-executivo/', mobile_views.MobileDashboardExecutivoView.as_view(), name='mobile-dashboard-executivo'),
]
