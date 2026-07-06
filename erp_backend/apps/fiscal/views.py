from decimal import Decimal

from django.db import models
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.configuracoes.models import get_empresa_configurada

from .models import ConfiguracaoFiscal
from .serializers import (
    ApuracaoSimplesNacionalSerializer,
    CalcularSimplesSerializer,
    CalcularImpostosSerializer,
    ConciliarPGDASSerializer,
    ConfiguracaoFiscalSerializer,
    ConsultaCNPJSerializer,
    EmitirDocumentoMockSerializer,
    FaturamentoMensalSimplesSerializer,
    PrevisaoSimplesSerializer,
    RegistrarFaturamentoSimplesSerializer,
    SimulacaoFiscalSimplesSerializer,
    SimularSimplesSerializer,
    VersaoRegraSimplesNacionalSerializer,
)
from .models import (
    ApuracaoSimplesNacional,
    FaturamentoMensalSimples,
    SimulacaoFiscalSimples,
    VersaoRegraSimplesNacional,
)
from .services import ConsultaCNPJ, MotorFiscalEspecialista, SimplesNacionalService
from apps.fiscal_calculator.serializers import DecisaoIbsCbsSerializer, OperacaoFiscalInputSerializer
from apps.fiscal_calculator.services import (
    CalculadoraTributariaReforma,
    OperacaoInput,
    carater_informativo_ibs_cbs,
    deve_destacar_ibs_cbs,
    normalizar_regime,
    obrigatorio_em_producao_ibs_cbs,
)
from apps.fiscal_emission.serializers import DocumentoFiscalEmitidoSerializer
from apps.fiscal_emission.services import obter_emissor
from apps.fiscal_obligations.serializers import ConciliacaoPGDASSerializer
from apps.fiscal_obligations.services import ConciliadorPGDAS
from apps.fiscal_rules.models import OperacaoFiscal, TabelaTributaria
from apps.fiscal_rules.serializers import OperacaoFiscalSerializer, TabelaTributariaSerializer


def _get_empresa():
    return get_empresa_configurada()


def _get_configuracao_fiscal():
    empresa = _get_empresa()
    configuracao, _ = ConfiguracaoFiscal.objects.get_or_create(
        empresa=empresa,
        defaults={
            "cnpj": empresa.cnpj,
            "razao_social": empresa.razao_social or empresa.nome,
            "regime_tributario": empresa.regime_tributario or ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL,
            "aliquota_iss": empresa.aliquota_issqn_padrao,
        },
    )
    campos_atualizar = []
    if empresa.regime_tributario and configuracao.regime_tributario != empresa.regime_tributario:
        configuracao.regime_tributario = empresa.regime_tributario
        campos_atualizar.append("regime_tributario")
    if empresa.cnpj and configuracao.cnpj != empresa.cnpj:
        configuracao.cnpj = empresa.cnpj
        campos_atualizar.append("cnpj")
    if empresa.razao_social and configuracao.razao_social != empresa.razao_social:
        configuracao.razao_social = empresa.razao_social
        campos_atualizar.append("razao_social")
    if empresa.aliquota_issqn_padrao is not None and configuracao.aliquota_iss != empresa.aliquota_issqn_padrao:
        configuracao.aliquota_iss = empresa.aliquota_issqn_padrao
        campos_atualizar.append("aliquota_iss")
    if campos_atualizar:
        campos_atualizar.append("atualizado_em")
        configuracao.save(update_fields=campos_atualizar)
    return configuracao


def _sincronizar_empresa_com_fiscal(configuracao: ConfiguracaoFiscal):
    empresa = configuracao.empresa
    campos = []
    pares = {
        "cnpj": configuracao.cnpj,
        "razao_social": configuracao.razao_social,
        "regime_tributario": configuracao.regime_tributario,
        "aliquota_issqn_padrao": configuracao.aliquota_iss,
    }
    for campo, valor in pares.items():
        if valor not in (None, "") and getattr(empresa, campo) != valor:
            setattr(empresa, campo, valor)
            campos.append(campo)
    if campos:
        empresa.save(update_fields=campos)


def _decimal(value, default="0.00"):
    if value in (None, ""):
        return Decimal(default)
    return Decimal(str(value))


def _buscar_faixa_customizada(rbt12: Decimal, tabela_faixas: list):
    if not isinstance(tabela_faixas, list) or not tabela_faixas:
        return None

    faixa_ordenada = sorted(
        tabela_faixas,
        key=lambda item: _decimal(item.get("limite"), default="9999999999.99"),
    )
    for indice, faixa in enumerate(faixa_ordenada, start=1):
        limite = _decimal(faixa.get("limite"), default="9999999999.99")
        if rbt12 <= limite:
            aliquota = _decimal(faixa.get("aliquota")) / Decimal("100")
            deduzir = _decimal(faixa.get("deduzir"))
            return indice, aliquota, deduzir

    ultima = faixa_ordenada[-1]
    return (
        len(faixa_ordenada),
        _decimal(ultima.get("aliquota")) / Decimal("100"),
        _decimal(ultima.get("deduzir")),
    )


def _alerta_por_limites(rbt12: Decimal, sublimite: Decimal, teto: Decimal):
    if teto > 0 and rbt12 >= teto:
        return ApuracaoSimplesNacional.Alerta.ACIMA_TETO
    if teto > 0 and rbt12 >= teto * Decimal("0.80"):
        return ApuracaoSimplesNacional.Alerta.PERTO_TETO
    if sublimite > 0 and rbt12 >= sublimite:
        return ApuracaoSimplesNacional.Alerta.ACIMA_SUBLIMITE
    if sublimite > 0 and rbt12 >= sublimite * Decimal("0.80"):
        return ApuracaoSimplesNacional.Alerta.PERTO_SUBLIMITE
    return ApuracaoSimplesNacional.Alerta.OK


def _aplicar_dados_cnpj(configuracao: ConfiguracaoFiscal, dados: dict):
    empresa = configuracao.empresa
    fiscal_campos = []
    empresa_campos = []

    mapeamento_fiscal = {
        "cnpj": dados.get("cnpj"),
        "razao_social": dados.get("razao_social"),
        "municipio": dados.get("municipio"),
        "codigo_municipio_ibge": dados.get("codigo_municipio_ibge") or dados.get("codigo_municipio"),
        "uf": dados.get("uf"),
    }
    for campo, valor in mapeamento_fiscal.items():
        if valor and getattr(configuracao, campo) != valor:
            setattr(configuracao, campo, valor)
            fiscal_campos.append(campo)

    mapeamento_empresa = {
        "cnpj": dados.get("cnpj"),
        "razao_social": dados.get("razao_social"),
        "email": dados.get("email"),
        "telefone": dados.get("telefone"),
    }
    for campo, valor in mapeamento_empresa.items():
        if valor and getattr(empresa, campo) != valor:
            setattr(empresa, campo, valor)
            empresa_campos.append(campo)

    endereco_partes = [
        dados.get("logradouro"),
        dados.get("numero"),
        dados.get("bairro"),
        dados.get("municipio"),
        dados.get("uf"),
        dados.get("cep"),
    ]
    endereco = ", ".join(str(item) for item in endereco_partes if item)
    if endereco and empresa.endereco != endereco:
        empresa.endereco = endereco
        empresa_campos.append("endereco")

    if fiscal_campos:
        fiscal_campos.append("atualizado_em")
        configuracao.save(update_fields=fiscal_campos)
    if empresa_campos:
        empresa.save(update_fields=empresa_campos)


def _sugerir_regime(dados: dict) -> str:
    atividade = (dados.get("atividade_principal") or "").lower()
    if "mei" in atividade:
        return ConfiguracaoFiscal.RegimeTributario.MEI
    if "comercio" in atividade or "varejo" in atividade:
        return ConfiguracaoFiscal.RegimeTributario.LUCRO_PRESUMIDO
    return ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def consultar_cnpj(request):
    serializer = ConsultaCNPJSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    service = ConsultaCNPJ()
    try:
        dados = service.consultar(serializer.validated_data["cnpj"])
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)
    except ConnectionError as exc:
        return Response({"detail": str(exc)}, status=503)

    return Response({**dados, "regime_sugerido": _sugerir_regime(dados)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def calcular_impostos(request):
    serializer = CalcularImpostosSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    config = _get_configuracao_fiscal()
    motor = MotorFiscalEspecialista()
    resultado = motor.calcular_operacao(
        valor_servicos=serializer.validated_data["valor_servicos"],
        valor_materiais=serializer.validated_data.get("valor_materiais", 0),
        config=config,
        contexto={
            "tipo_servico": serializer.validated_data.get("tipo_servico", ""),
            "descricao_servico": serializer.validated_data.get("descricao_servico", ""),
            "municipio_execucao": serializer.validated_data.get("municipio_execucao", ""),
            "uf_execucao": serializer.validated_data.get("uf_execucao", ""),
        },
    )
    return Response(resultado)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def calcular_reforma_tributaria(request):
    serializer = OperacaoFiscalInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    operacao = OperacaoInput(**data)
    resultado = CalculadoraTributariaReforma().calcular_tributos(operacao)
    operacao_fiscal = None

    if request.data.get("salvar_snapshot"):
        operacao_fiscal = OperacaoFiscal.objects.create(
            referencia=request.data.get("referencia", ""),
            data_emissao=operacao.data_emissao,
            regime_emitente=normalizar_regime(operacao.regime_emitente),
            regime_destinatario=normalizar_regime(operacao.regime_destinatario) if operacao.regime_destinatario else "",
            valor_base=operacao.base_total,
            tributos_calculados=resultado,
            versao_motor=resultado["versao_motor"],
        )
        regras = TabelaTributaria.objects.filter(id__in=resultado.get("tabelas_aplicadas_ids", []))
        operacao_fiscal.tabelas_aplicadas.set(regras)

    payload = {"resultado": resultado}
    if operacao_fiscal:
        payload["operacao_fiscal"] = OperacaoFiscalSerializer(operacao_fiscal).data
    return Response(payload)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def decisao_ibs_cbs(request):
    serializer = DecisaoIbsCbsSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    regime = serializer.validated_data["regime"]
    data_emissao = serializer.validated_data["data_emissao"]
    return Response({
        "regime": normalizar_regime(regime),
        "data_emissao": data_emissao,
        "destacar": deve_destacar_ibs_cbs(regime, data_emissao),
        "obrigatorio_em_producao": obrigatorio_em_producao_ibs_cbs(regime, data_emissao),
        "carater_informativo": carater_informativo_ibs_cbs(regime, data_emissao),
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def tabelas_tributarias(request):
    if request.method == "POST":
        serializer = TabelaTributariaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    queryset = TabelaTributaria.objects.all()
    codigo = request.query_params.get("codigo_tributo")
    vigente_em = request.query_params.get("vigente_em")
    if codigo:
        queryset = queryset.filter(codigo_tributo=codigo)
    if vigente_em:
        queryset = queryset.filter(vigencia_inicio__lte=vigente_em).filter(
            models.Q(vigencia_fim__isnull=True) | models.Q(vigencia_fim__gte=vigente_em)
        )
    return Response(TabelaTributariaSerializer(queryset[:200], many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def operacoes_fiscais(request):
    queryset = OperacaoFiscal.objects.prefetch_related("tabelas_aplicadas")[:100]
    return Response(OperacaoFiscalSerializer(queryset, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def emitir_documento_mock(request):
    serializer = EmitirDocumentoMockSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    operacao = OperacaoFiscal.objects.get(id=serializer.validated_data["operacao_fiscal_id"])
    payload = {
        "tipo_documento": serializer.validated_data.get("tipo_documento") or "NFS-e",
        "numero": serializer.validated_data.get("numero") or "",
        "serie": serializer.validated_data.get("serie") or "",
        "dados": serializer.validated_data.get("dados") or {},
    }
    documento = obter_emissor().emitir(operacao_fiscal=operacao, payload=payload)
    return Response(DocumentoFiscalEmitidoSerializer(documento).data, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def conciliar_pgdas(request):
    serializer = ConciliarPGDASSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    conciliacao = ConciliadorPGDAS().gerar_conciliacao(**serializer.validated_data)
    return Response(ConciliacaoPGDASSerializer(conciliacao).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def simples_faturamentos(request):
    config = _get_configuracao_fiscal()
    service = SimplesNacionalService()

    if request.method == "POST":
        serializer = RegistrarFaturamentoSimplesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resultado = service.registrar_receita(
            configuracao=config,
            competencia=serializer.validated_data["competencia"],
            receita_bruta=serializer.validated_data["receita_bruta"],
            origem=serializer.validated_data.get("origem"),
            observacoes=serializer.validated_data.get("observacoes", ""),
        )
        faturamento = FaturamentoMensalSimples.objects.get(
            empresa=config.empresa,
            competencia=service._normalizar_competencia(serializer.validated_data["competencia"]),
        )
        return Response({
            "faturamento": FaturamentoMensalSimplesSerializer(faturamento).data,
            "apuracao": resultado,
        }, status=201)

    queryset = FaturamentoMensalSimples.objects.filter(empresa=config.empresa).order_by("-competencia")[:36]
    return Response(FaturamentoMensalSimplesSerializer(queryset, many=True).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def simples_apuracao(request):
    config = _get_configuracao_fiscal()
    service = SimplesNacionalService()

    if request.method == "POST":
        serializer = CalcularSimplesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        competencia = serializer.validated_data.get("competencia")
    else:
        serializer = CalcularSimplesSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        competencia = serializer.validated_data.get("competencia")

    resultado = service.calcular(config, competencia=competencia, salvar=True)
    historico = ApuracaoSimplesNacional.objects.filter(empresa=config.empresa).order_by("-competencia")[:12]
    return Response({
        "atual": resultado,
        "historico": ApuracaoSimplesNacionalSerializer(historico, many=True).data,
        "configuracao": ConfiguracaoFiscalSerializer(config).data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def simples_previsao(request):
    serializer = PrevisaoSimplesSerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    config = _get_configuracao_fiscal()
    previsao = SimplesNacionalService().prever(
        config,
        meses=serializer.validated_data["meses"],
        crescimento_mensal=serializer.validated_data["crescimento_mensal"],
    )
    return Response({
        "previsao": previsao,
        "configuracao": ConfiguracaoFiscalSerializer(config).data,
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def simples_regras(request):
    config = _get_configuracao_fiscal()

    if request.method == "POST":
        serializer = VersaoRegraSimplesNacionalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        regra = serializer.save(empresa=config.empresa)
        return Response(VersaoRegraSimplesNacionalSerializer(regra).data, status=201)

    queryset = VersaoRegraSimplesNacional.objects.filter(empresa=config.empresa).order_by("-criado_em")
    status = request.query_params.get("status")
    if status:
        queryset = queryset.filter(status=status)
    return Response(VersaoRegraSimplesNacionalSerializer(queryset[:100], many=True).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def simples_regra_detalhe(request, regra_id):
    config = _get_configuracao_fiscal()
    regra = VersaoRegraSimplesNacional.objects.filter(empresa=config.empresa, id=regra_id).first()
    if not regra:
        return Response({"detail": "Regra não encontrada."}, status=404)

    serializer = VersaoRegraSimplesNacionalSerializer(regra, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    regra = serializer.save()
    return Response(VersaoRegraSimplesNacionalSerializer(regra).data)


@api_view(["POST", "GET"])
@permission_classes([IsAuthenticated])
def simples_simular(request):
    config = _get_configuracao_fiscal()
    payload = request.data if request.method == "POST" else request.query_params
    serializer = SimularSimplesSerializer(data=payload)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    service = SimplesNacionalService()
    competencia = data.get("competencia")
    resultado = service.calcular(config, competencia=competencia, salvar=False)

    receita_mes = _decimal(resultado.get("receita_mes"))
    if data.get("receita_bruta") is not None:
        receita_mes = _decimal(data.get("receita_bruta"))
        resultado["receita_mes"] = service._money(receita_mes)

    regra = None
    regra_id = data.get("regra_versao_id")
    if regra_id:
        regra = VersaoRegraSimplesNacional.objects.filter(empresa=config.empresa, id=regra_id).first()
        if not regra:
            return Response({"detail": "Regra informada não encontrada."}, status=404)

        rbt12 = _decimal(resultado.get("rbt12"))
        faixa_custom = _buscar_faixa_customizada(rbt12, regra.tabela_faixas)
        if faixa_custom:
            faixa, aliquota_nominal, parcela_deduzir = faixa_custom
            aliquota_efetiva = (
                ((rbt12 * aliquota_nominal) - parcela_deduzir) / rbt12 if rbt12 > 0 else Decimal("0.00")
            )
            if aliquota_efetiva < 0:
                aliquota_efetiva = Decimal("0.00")

            sublimite = _decimal(regra.sublimite, default="3600000.00")
            teto = _decimal(regra.teto, default="4800000.00")
            resultado.update({
                "faixa": faixa,
                "aliquota_nominal": service._percent(aliquota_nominal),
                "parcela_deduzir": service._money(parcela_deduzir),
                "aliquota_efetiva": service._percent(aliquota_efetiva),
                "das_estimado": service._money(receita_mes * aliquota_efetiva),
                "percentual_sublimite": service._percent((rbt12 / sublimite) if sublimite else Decimal("0.00")),
                "percentual_teto": service._percent((rbt12 / teto) if teto else Decimal("0.00")),
                "alerta": _alerta_por_limites(rbt12, sublimite, teto),
                "sublimite": service._money(sublimite),
                "teto": service._money(teto),
            })

    resultado["regra_aplicada"] = {
        "id": regra.id if regra else None,
        "nome": regra.nome if regra else "regra_padrao_erp",
        "anexo": regra.anexo if regra else config.anexo_simples,
    }

    simulacao = SimulacaoFiscalSimples.objects.create(
        empresa=config.empresa,
        competencia=service._normalizar_competencia(competencia),
        regra_versao=regra,
        entrada={
            "competencia": str(competencia) if competencia else None,
            "receita_bruta": str(data.get("receita_bruta")) if data.get("receita_bruta") is not None else None,
            "regra_versao_id": regra.id if regra else None,
        },
        resultado={
            **resultado,
            "receita_mes": str(resultado.get("receita_mes")),
            "rbt12": str(resultado.get("rbt12")),
            "aliquota_nominal": str(resultado.get("aliquota_nominal")),
            "parcela_deduzir": str(resultado.get("parcela_deduzir")),
            "aliquota_efetiva": str(resultado.get("aliquota_efetiva")),
            "das_estimado": str(resultado.get("das_estimado")),
            "percentual_sublimite": str(resultado.get("percentual_sublimite")),
            "percentual_teto": str(resultado.get("percentual_teto")),
            "sublimite": str(resultado.get("sublimite")),
            "teto": str(resultado.get("teto")),
        },
        origem=data.get("origem", SimulacaoFiscalSimples.Origem.API),
    )

    return Response({
        "simulacao": SimulacaoFiscalSimplesSerializer(simulacao).data,
        "resultado": resultado,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def simples_simulacoes(request):
    config = _get_configuracao_fiscal()
    queryset = SimulacaoFiscalSimples.objects.filter(empresa=config.empresa).select_related("regra_versao")
    return Response(SimulacaoFiscalSimplesSerializer(queryset[:100], many=True).data)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def configuracao(request):
    config = _get_configuracao_fiscal()
    if request.method == "PATCH":
        serializer = ConfiguracaoFiscalSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        config = serializer.save()
        _sincronizar_empresa_com_fiscal(config)
        return Response(ConfiguracaoFiscalSerializer(config).data)
    return Response(ConfiguracaoFiscalSerializer(config).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sincronizar_cnpj_cadastrado(request):
    config = _get_configuracao_fiscal()
    cnpj = request.data.get("cnpj") or config.cnpj or config.empresa.cnpj
    if not cnpj:
        return Response({"detail": "Nenhum CNPJ cadastrado para sincronizar."}, status=400)

    service = ConsultaCNPJ()
    try:
        dados = service.consultar(cnpj)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)
    except ConnectionError as exc:
        return Response({"detail": str(exc)}, status=503)

    _aplicar_dados_cnpj(config, dados)
    config.refresh_from_db()
    return Response({
        "configuracao": ConfiguracaoFiscalSerializer(config).data,
        "cnpj": dados,
        "regime_atual": config.regime_tributario,
        "observacao": "Dados cadastrais sincronizados pelo CNPJ. O regime tributário permanece o regime configurado no ERP.",
    })
