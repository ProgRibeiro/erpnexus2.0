from django.urls import path
from .views import DiretorioPrestadoresView

urlpatterns = [
    path('diretorio/prestadores/', DiretorioPrestadoresView.as_view(), name='diretorio-prestadores'),
]
