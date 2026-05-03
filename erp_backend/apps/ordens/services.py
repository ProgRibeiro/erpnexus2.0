import io
import re
from collections import Counter
from decimal import Decimal, InvalidOperation

from django.utils import timezone
from pypdf import PdfReader

from .models import AprendizadoPedidoCompra


class PedidoCompraInteligente:
    money_pattern = re.compile(r"R\$\s*([\d\.\,]+)")
    date_pattern = re.compile(r"\b(\d{2}/\d{2}/\d{4})\b")
    number_patterns = [
        re.compile(r"(?:pedido\s*de\s*compra|n[úu]mero\s*do\s*pc|pc|po)[^\w]{0,10}([A-Z0-9\-\/]{4,})", re.IGNORECASE),
        re.compile(r"\b([A-Z]{1,4}-\d{4,}[\w\-\/]*)\b"),
    ]

    def analisar_arquivo(self, arquivo, ordem=None):
        texto = self._extrair_texto_pdf(arquivo)
        return self.analisar_texto(texto, ordem=ordem)

    def analisar_texto(self, texto, ordem=None):
        texto_limpo = self._normalizar_texto(texto)
        linhas = [linha.strip() for linha in texto_limpo.splitlines() if linha.strip()]

        numero_pc = self._extrair_numero_pc(texto_limpo)
        valor_sugerido = self._extrair_maior_valor(texto_limpo)
        validade = self._extrair_validade(texto_limpo)
        itens_detectados = self._extrair_itens(linhas)
        descricao_sugerida = self._montar_descricao_sugerida(ordem, linhas, itens_detectados)
        aprendizado = self._consultar_aprendizado(ordem)
        confianca = self._calcular_confianca(numero_pc, valor_sugerido, validade, itens_detectados, aprendizado)

        resumo = descricao_sugerida or "Nenhum resumo relevante foi encontrado no PDF."

        return {
            "texto_extraido": texto_limpo[:12000],
            "numero_pc_sugerido": numero_pc,
            "valor_autorizado_sugerido": str(valor_sugerido or Decimal("0.00")),
            "validade_sugerida": validade.isoformat() if validade else None,
            "descricao_sugerida": descricao_sugerida,
            "itens_detectados": itens_detectados,
            "resumo": resumo,
            "confianca": str(confianca),
            "aprendizado_cliente": aprendizado,
            "analisado_em": timezone.now().isoformat(),
        }

    def registrar_aprendizado(self, ordem, usuario=None):
        if not ordem or not ordem.tem_pedido_compra:
            return None

        texto_extraido = ""
        if isinstance(ordem.dados_pc_extraidos, dict):
            texto_extraido = ordem.dados_pc_extraidos.get("texto_extraido", "")

        if not any([texto_extraido, ordem.descricao_servico, ordem.numero_pc]):
            return None

        aprendizado, _ = AprendizadoPedidoCompra.objects.update_or_create(
            os=ordem,
            defaults={
                "cliente": ordem.cliente,
                "texto_extraido": texto_extraido[:12000],
                "descricao_confirmada": ordem.descricao_servico or "",
                "numero_pc_confirmado": ordem.numero_pc or "",
                "valor_autorizado_confirmado": ordem.valor_autorizado_pc or Decimal("0.00"),
                "validade_confirmada": ordem.validade_pc,
                "criado_por": usuario,
            },
        )
        return aprendizado

    def _extrair_texto_pdf(self, arquivo):
        if hasattr(arquivo, "seek"):
            arquivo.seek(0)
        conteudo = arquivo.read() if hasattr(arquivo, "read") else arquivo
        if hasattr(arquivo, "seek"):
            arquivo.seek(0)

        reader = PdfReader(io.BytesIO(conteudo))
        textos = []
        for page in reader.pages:
            try:
                textos.append(page.extract_text() or "")
            except Exception:
                continue
        return "\n".join(textos)

    def _normalizar_texto(self, texto):
        bruto = str(texto or "").replace("\x00", " ")
        return re.sub(r"[ \t]+", " ", bruto).strip()

    def _extrair_numero_pc(self, texto):
        for pattern in self.number_patterns:
            match = pattern.search(texto)
            if match:
                return match.group(1).strip(" .:-")
        return ""

    def _extrair_maior_valor(self, texto):
        valores = []
        for match in self.money_pattern.findall(texto):
            valor = self._parse_decimal(match)
            if valor is not None:
                valores.append(valor)
        return max(valores) if valores else None

    def _extrair_validade(self, texto):
        hoje = timezone.localdate()
        datas = []
        for match in self.date_pattern.findall(texto):
            try:
                data = timezone.datetime.strptime(match, "%d/%m/%Y").date()
                if data >= hoje:
                    datas.append(data)
            except ValueError:
                continue
        return min(datas) if datas else None

    def _extrair_itens(self, linhas):
        ignorar = {
            "pedido de compra",
            "cliente",
            "fornecedor",
            "valor total",
            "validade",
            "condicao de pagamento",
            "cnpj",
            "telefone",
        }
        itens = []
        for linha in linhas:
            texto = linha.strip()
            if len(texto) < 8 or len(texto) > 180:
                continue
            texto_lower = texto.lower()
            if any(chave in texto_lower for chave in ignorar):
                continue
            if re.search(r"\b(qtd|quantidade|valor|unit|total)\b", texto_lower):
                continue
            if re.search(r"\d{2}/\d{2}/\d{4}", texto_lower):
                continue
            itens.append(texto)
        return itens[:8]

    def _montar_descricao_sugerida(self, ordem, linhas, itens_detectados):
        if itens_detectados:
            return " | ".join(itens_detectados[:4])

        aprendizado = AprendizadoPedidoCompra.objects.filter(
            cliente=getattr(ordem, "cliente", None)
        ).exclude(descricao_confirmada="")[:5]
        if aprendizado:
            descricoes = [registro.descricao_confirmada for registro in aprendizado if registro.descricao_confirmada]
            if descricoes:
                return descricoes[0]

        linhas_longas = [linha for linha in linhas if 20 <= len(linha) <= 180]
        return " ".join(linhas_longas[:3]).strip()

    def _consultar_aprendizado(self, ordem):
        if not ordem or not getattr(ordem, "cliente_id", None):
            return {"exemplos": 0, "termos_frequentes": []}

        exemplos = AprendizadoPedidoCompra.objects.filter(cliente_id=ordem.cliente_id)[:10]
        termos = Counter()
        for exemplo in exemplos:
            for termo in re.findall(r"[A-Za-zÀ-ÿ]{4,}", exemplo.descricao_confirmada or ""):
                termos[termo.lower()] += 1

        return {
            "exemplos": exemplos.count(),
            "termos_frequentes": [termo for termo, _ in termos.most_common(6)],
        }

    def _calcular_confianca(self, numero_pc, valor_sugerido, validade, itens_detectados, aprendizado):
        score = Decimal("0")
        if numero_pc:
            score += Decimal("25")
        if valor_sugerido:
            score += Decimal("25")
        if validade:
            score += Decimal("15")
        if itens_detectados:
            score += Decimal("25")
        if aprendizado.get("exemplos", 0):
            score += Decimal("10")
        return min(score, Decimal("100"))

    def _parse_decimal(self, valor):
        normalizado = str(valor).replace(".", "").replace(",", ".").strip()
        try:
            return Decimal(normalizado)
        except (InvalidOperation, ValueError):
            return None
