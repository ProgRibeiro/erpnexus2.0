from __future__ import annotations

from abc import ABC, abstractmethod

from django.utils.crypto import get_random_string

from .models import ConfiguracaoEmissorFiscal, DocumentoFiscalEmitido, ProvedorEmissaoFiscal


class EmissorFiscalInterface(ABC):
    @abstractmethod
    def emitir(self, *, operacao_fiscal, payload: dict) -> DocumentoFiscalEmitido:
        raise NotImplementedError


class EmissorFiscalMock(EmissorFiscalInterface):
    """Simulador local para homologar o fluxo sem transmitir SEFAZ/prefeitura."""

    def __init__(self, configuracao: ConfiguracaoEmissorFiscal):
        self.configuracao = configuracao

    def emitir(self, *, operacao_fiscal, payload: dict) -> DocumentoFiscalEmitido:
        chave = f"MOCK{get_random_string(38, allowed_chars='0123456789')}"
        return DocumentoFiscalEmitido.objects.create(
            emissor=self.configuracao,
            operacao_fiscal=operacao_fiscal,
            tipo_documento=payload.get("tipo_documento") or "NFS-e",
            ambiente=self.configuracao.ambiente,
            status=DocumentoFiscalEmitido.Status.AUTORIZADO,
            chave_acesso=chave,
            numero=payload.get("numero") or get_random_string(8, allowed_chars="0123456789"),
            serie=payload.get("serie") or "1",
            protocolo=f"MOCK-{get_random_string(12).upper()}",
            payload_enviado=payload,
            retorno_provedor={
                "provedor": ProvedorEmissaoFiscal.MOCK,
                "mensagem": "Documento autorizado pelo simulador local. Não houve transmissão externa.",
            },
        )


class EmissorFiscalNaoConfigurado(EmissorFiscalInterface):
    def __init__(self, configuracao: ConfiguracaoEmissorFiscal):
        self.configuracao = configuracao

    def emitir(self, *, operacao_fiscal, payload: dict) -> DocumentoFiscalEmitido:
        raise NotImplementedError(
            "Provedor de emissão ainda não implementado. Configure o emissor mock ou integre um provedor externo."
        )


def obter_emissor(configuracao: ConfiguracaoEmissorFiscal | None = None) -> EmissorFiscalInterface:
    configuracao = configuracao or ConfiguracaoEmissorFiscal.objects.filter(ativo=True).first()
    if not configuracao:
        configuracao = ConfiguracaoEmissorFiscal.objects.create()
    if configuracao.provedor == ProvedorEmissaoFiscal.MOCK:
        return EmissorFiscalMock(configuracao)
    return EmissorFiscalNaoConfigurado(configuracao)
