from django.db import models

from apps.fiscal_rules.models import AmbienteFiscal


class ProvedorEmissaoFiscal(models.TextChoices):
    MOCK = "mock", "Simulador interno"
    FOCUS_NFE = "focus_nfe", "Focus NFe"
    ENOTAS = "enotas", "eNotas"
    TECNOSPEED = "tecnospeed", "TecnoSpeed"
    NFE_IO = "nfe_io", "NFE.io"
    BIBLIOTECA_PYTHON = "biblioteca_python", "Biblioteca Python"


class ConfiguracaoEmissorFiscal(models.Model):
    nome = models.CharField(max_length=120, default="Emissor padrão")
    provedor = models.CharField(max_length=40, choices=ProvedorEmissaoFiscal.choices, default=ProvedorEmissaoFiscal.MOCK)
    ambiente = models.CharField(max_length=20, choices=AmbienteFiscal.choices, default=AmbienteFiscal.HOMOLOGACAO)
    ativo = models.BooleanField(default=True)
    credenciais = models.JSONField(default=dict, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-ativo", "nome"]
        verbose_name = "Configuração de emissor fiscal"
        verbose_name_plural = "Configurações de emissores fiscais"

    def __str__(self):
        return f"{self.nome} - {self.get_provedor_display()} ({self.ambiente})"


class DocumentoFiscalEmitido(models.Model):
    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        ENVIADO = "enviado", "Enviado"
        AUTORIZADO = "autorizado", "Autorizado"
        REJEITADO = "rejeitado", "Rejeitado"
        CANCELADO = "cancelado", "Cancelado"

    emissor = models.ForeignKey(ConfiguracaoEmissorFiscal, on_delete=models.PROTECT, related_name="documentos")
    operacao_fiscal = models.ForeignKey("fiscal_rules.OperacaoFiscal", on_delete=models.PROTECT, related_name="documentos_emitidos")
    tipo_documento = models.CharField(max_length=12, default="NFS-e")
    ambiente = models.CharField(max_length=20, choices=AmbienteFiscal.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RASCUNHO)
    chave_acesso = models.CharField(max_length=80, blank=True)
    numero = models.CharField(max_length=40, blank=True)
    serie = models.CharField(max_length=20, blank=True)
    protocolo = models.CharField(max_length=80, blank=True)
    payload_enviado = models.JSONField(default=dict, blank=True)
    retorno_provedor = models.JSONField(default=dict, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Documento fiscal emitido"
        verbose_name_plural = "Documentos fiscais emitidos"

    def __str__(self):
        return self.chave_acesso or f"{self.tipo_documento} #{self.pk}"
