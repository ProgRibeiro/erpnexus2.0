import {
  Alert,
  Card,
  Col,
  Collapse,
  Descriptions,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { SafetyCertificateOutlined } from "@ant-design/icons";

const { Paragraph, Text, Title } = Typography;

const colors = {
  azul: "#3B82F6",
  roxo: "#5B21B6",
  verde: "#1A7A4A",
  laranja: "#B45309",
  vermelho: "#B91C1C",
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  fundoSuave: "#F8FAFD",
};

const panelStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const normalizeTipoNota = (tipo) => {
  const value = String(tipo || "").toLowerCase();
  if (["nfse", "nfs_e", "nfs-e"].includes(value)) return "nfse";
  if (["nfe", "nf_e", "nf-e"].includes(value)) return "nfe";
  return value || "nao_informado";
};

const getIssAliquota = (config) => {
  const value = Number(config?.aliquota_iss ?? config?.iss_aliquota ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 5;
};

const getCodigoIbge = (config) =>
  String(config?.codigo_municipio_ibge || config?.codigo_ibge || "").replace(
    /\D/g,
    "",
  );

const getRegimeMeta = (config = {}) => {
  const regime = String(config.regime_tributario || "").toLowerCase();
  if (regime === "simples_nacional") {
    return {
      titulo: "Validador fiscal - Simples Nacional",
      subtitulo:
        "Orientação prática para NFS-e, ISS, LC 116/2003, DAS unificado e transição tributária.",
      alerta:
        "Configuração básica consistente para análise de NFS-e no Simples Nacional.",
      alertaDescricao:
        "Confirme anexo, RBT12, código de serviço, retenções e regras municipais antes da emissão.",
      regimeEsperado: "simples_nacional",
    };
  }

  if (regime === "lucro_real") {
    return {
      titulo: "Validador fiscal - Lucro Real",
      subtitulo:
        "Orientação prática para NFS-e, ISS, apuração contábil efetiva e CBS/IBS.",
      alerta:
        "Configuração básica consistente para análise de NFS-e no Lucro Real.",
      alertaDescricao:
        "IRPJ e CSLL dependem da apuração contábil; valide também a política de créditos e retenções.",
      regimeEsperado: "lucro_real",
    };
  }

  if (regime === "mei") {
    return {
      titulo: "Validador fiscal - MEI",
      subtitulo: "Orientação prática para NFS-e, ISS e limites do MEI.",
      alerta: "Configuração básica consistente para análise de NFS-e no MEI.",
      alertaDescricao:
        "MEI não segue a lógica de Lucro Presumido; valide limites, tipo de atividade e emissão da nota.",
      regimeEsperado: "mei",
    };
  }

  return {
    titulo: "Validador fiscal - Lucro Presumido",
    subtitulo:
      "Orientação prática para NFS-e, ISS, LC 116/2003, alíquotas federais e Reforma Tributária.",
    alerta:
      "Configuração fiscal básica consistente para análise de NFS-e no Lucro Presumido.",
    alertaDescricao:
      "Ainda assim, confirme código de serviço, retenção e alíquota diretamente na legislação municipal.",
    regimeEsperado: "lucro_presumido",
  };
};

const getValidacoes = (config = {}) => {
  const validacoes = [];
  const regime = config.regime_tributario;
  const meta = getRegimeMeta(config);
  const tipoNota = normalizeTipoNota(
    config.tipo_nota || config.tipo_nota_fiscal,
  );
  const aliquotaIss = Number(config.aliquota_iss ?? 0);
  const codigoIbge = getCodigoIbge(config);

  if (regime !== meta.regimeEsperado) {
    validacoes.push({
      type: "warning",
      message: `O guia abaixo está calibrado para ${meta.titulo.replace("Validador fiscal - ", "")}.`,
      description:
        "Se o regime da empresa mudar, as regras de cálculo e obrigação também mudam.",
    });
  }

  if (tipoNota !== "nfse" && tipoNota !== "ambas") {
    validacoes.push({
      type: "warning",
      message: "Para prestação de serviços, o padrão é NFS-e.",
      description:
        "NF-e é usada quando há circulação de mercadoria. NFC-e é venda presencial ao consumidor.",
    });
  }

  if (!config.municipio || !config.uf) {
    validacoes.push({
      type: "warning",
      message: "Município e UF precisam estar preenchidos.",
      description:
        "Eles definem a competência do ISS e a integração fiscal com a prefeitura.",
    });
  }

  if (!codigoIbge || codigoIbge.length !== 7) {
    validacoes.push({
      type: "warning",
      message: "Código IBGE do município deve ter 7 dígitos.",
      description:
        "Esse código padroniza o município nas integrações fiscais e evita rejeição da nota.",
    });
  }

  if (!aliquotaIss || aliquotaIss < 2 || aliquotaIss > 5) {
    validacoes.push({
      type: "error",
      message: "Alíquota de ISS fora do intervalo comum da LC 116.",
      description:
        "Informe a alíquota municipal aplicável, normalmente entre 2% e 5%, conforme serviço e município.",
    });
  }

  if (!config.codigo_servico_lc116) {
    validacoes.push({
      type: "warning",
      message: "Informe o código de serviço da LC 116/2003.",
      description:
        "Classificação incorreta pode gerar ISS no município errado, retenção indevida ou autuação.",
    });
  }

  if (config.iss_retido_fonte) {
    validacoes.push({
      type: "info",
      message: "ISS marcado como retido na fonte.",
      description:
        "Confirme se o tomador é obrigado a reter pelo município ou pelo tipo de serviço.",
    });
  }

  if (!validacoes.length) {
    validacoes.push({
      type: "success",
      message: meta.alerta,
      description: meta.alertaDescricao,
    });
  }

  return validacoes;
};

const calcularExemplo = (valor, aliquotaIss) => {
  const base = Number(valor || 10000);
  const iss = base * (aliquotaIss / 100);
  const pis = base * 0.0065;
  const cofins = base * 0.03;
  const irpj = base * 0.048;
  const csll = base * 0.0288;
  const federais = pis + cofins + irpj + csll;
  const total = federais + iss;

  return {
    base,
    iss,
    pis,
    cofins,
    irpj,
    csll,
    federais,
    total,
    cargaFederal: 11.33,
    cargaTotal: (total / base) * 100,
  };
};

const aliquotasColumns = [
  { title: "Tributo", dataIndex: "tributo", width: 130 },
  { title: "Alíquota efetiva", dataIndex: "aliquota", width: 160 },
  { title: "Base prática", dataIndex: "base" },
  { title: "Observação", dataIndex: "observacao" },
];

const reformaColumns = [
  { title: "Período", dataIndex: "periodo", width: 160 },
  { title: "Efeito no ERP", dataIndex: "efeito" },
  { title: "Ação recomendada", dataIndex: "acao" },
];

export default function GuiaLucroPresumido({
  config = {},
  valorReferencia = 10000,
  compact = false,
}) {
  const aliquotaIss = getIssAliquota(config);
  const exemplo = calcularExemplo(valorReferencia || 10000, aliquotaIss);
  const tipoNota = normalizeTipoNota(
    config.tipo_nota || config.tipo_nota_fiscal,
  );
  const municipio =
    config.municipio && config.uf
      ? `${config.municipio}/${config.uf}`
      : "Não informado";
  const validacoes = getValidacoes(config);
  const meta = getRegimeMeta(config);
  const rotuloAliquotas =
    meta.regimeEsperado === "lucro_presumido"
      ? "6. Alíquotas federais no Lucro Presumido"
      : "6. Referências fiscais do regime selecionado";

  const aliquotasData = [
    {
      key: "pis",
      tributo: "PIS",
      aliquota: "0,65%",
      base: "Receita bruta no regime cumulativo",
      observacao: "Substituído gradualmente pela CBS no novo modelo.",
    },
    {
      key: "cofins",
      tributo: "COFINS",
      aliquota: "3,00%",
      base: "Receita bruta no regime cumulativo",
      observacao: "Sem crédito amplo no modelo atual cumulativo.",
    },
    {
      key: "irpj",
      tributo: "IRPJ",
      aliquota: "4,80%",
      base: "32% de presunção x 15% de IRPJ",
      observacao:
        "Pode haver adicional de 10% sobre parcela da base trimestral acima do limite legal.",
    },
    {
      key: "csll",
      tributo: "CSLL",
      aliquota: "2,88%",
      base: "32% de presunção x 9% de CSLL",
      observacao:
        "Serviços em geral usam presunção de 32%, salvo exceções legais.",
    },
    {
      key: "iss",
      tributo: "ISS",
      aliquota: `${aliquotaIss.toFixed(2).replace(".", ",")}%`,
      base: "Preço do serviço",
      observacao:
        "Depende do município, código de serviço e regra de retenção.",
    },
  ];

  const exemploData = [
    {
      key: "pis",
      tributo: "PIS",
      aliquota: "0,65%",
      valor: formatCurrency(exemplo.pis),
      grupo: "Federal",
    },
    {
      key: "cofins",
      tributo: "COFINS",
      aliquota: "3,00%",
      valor: formatCurrency(exemplo.cofins),
      grupo: "Federal",
    },
    {
      key: "irpj",
      tributo: "IRPJ",
      aliquota: "4,80%",
      valor: formatCurrency(exemplo.irpj),
      grupo: "Federal",
    },
    {
      key: "csll",
      tributo: "CSLL",
      aliquota: "2,88%",
      valor: formatCurrency(exemplo.csll),
      grupo: "Federal",
    },
    {
      key: "iss",
      tributo: "ISS",
      aliquota: `${aliquotaIss.toFixed(2).replace(".", ",")}%`,
      valor: formatCurrency(exemplo.iss),
      grupo: "Municipal",
    },
  ];

  const collapseItems = [
    {
      key: "1",
      label: "1. Regime tributário",
      children: (
        <Space direction="vertical" size={8}>
          <Paragraph>
            {meta.titulo.includes("Simples Nacional")
              ? "No Simples Nacional, o ERP deve respeitar o DAS, o anexo configurado e a apuração mensal de faturamento, sem herdar lógica de Lucro Presumido."
              : meta.titulo.includes("Lucro Real")
                ? "No Lucro Real, IRPJ e CSLL dependem da apuração contábil efetiva. O ERP não deve presumir margem nem replicar regra de Lucro Presumido."
                : "Para serviços de manutenção, refrigeração, elétrica, HVAC e civil, o Lucro Presumido pode ser adequado quando a margem real é compatível com a presunção e a empresa não está obrigada ao Lucro Real. O ERP deve usar esse regime somente quando ele estiver confirmado no cadastro fiscal da empresa responsável."}
          </Paragraph>
          <Paragraph>
            {meta.titulo.includes("Simples Nacional")
              ? "Impacto prático: a apuração usa DAS unificado, com tratamento por anexo e RBT12, mantendo NFS-e e retenções municipais alinhadas ao regime cadastrado."
              : meta.titulo.includes("Lucro Real")
                ? "Impacto prático: a apuração depende do lucro contábil, dos ajustes fiscais e das políticas de crédito; retenções e tributos acessórios continuam sendo conferidos por nota e por período."
                : "Impacto prático: PIS e COFINS são cumulativos, IRPJ e CSLL usam base presumida. Para serviços em geral, a referência usual é presunção de 32%, resultando em IRPJ de 4,80% e CSLL de 2,88% sobre a receita bruta."}
          </Paragraph>
          <Alert
            type="warning"
            showIcon
            message="Risco"
            description={
              meta.titulo.includes("Simples Nacional")
                ? "Se o cadastro estiver em Simples mas a empresa for tratada como Lucro Presumido, o faturamento e os relatórios vão ser calculados errado."
                : meta.titulo.includes("Lucro Real")
                  ? "Se houver obrigação de Lucro Real e o ERP tratar como Lucro Presumido, a apuração fica incorreta."
                  : "Se houver obrigação de Lucro Real por atividade, receita, instituição financeira, lucro no exterior ou outra hipótese legal, emitir como Lucro Presumido gera apuração incorreta."
            }
          />
        </Space>
      ),
    },
    {
      key: "2",
      label: "2. Tipo de nota fiscal",
      children: (
        <Paragraph>
          Para prestação de serviços, use NFS-e. Use NF-e quando houver
          venda/circulação de mercadorias e NFC-e para venda presencial ao
          consumidor final. Quando uma OS misturar serviço e material, o
          enquadramento depende da natureza da operação, do contrato e do
          tratamento municipal do item de serviço.
        </Paragraph>
      ),
    },
    {
      key: "3",
      label: "3. Município, UF e código IBGE",
      children: (
        <Space direction="vertical" size={8}>
          <Paragraph>
            Município configurado: <Text strong>{municipio}</Text>. Pela LC
            116/2003, a regra geral do ISS é o local do estabelecimento
            prestador, com exceções na própria lei, como construção civil,
            obras, limpeza, vigilância e outros serviços que podem deslocar a
            incidência para o local da execução ou do tomador.
          </Paragraph>
          <Paragraph>
            O código IBGE identifica oficialmente o município na integração
            fiscal. Código ausente ou errado pode causar rejeição da NFS-e ou
            escrituração em município incorreto.
          </Paragraph>
        </Space>
      ),
    },
    {
      key: "4",
      label: "4. ISS e ISS retido",
      children: (
        <Space direction="vertical" size={8}>
          <Paragraph>
            A alíquota do ISS deve respeitar a legislação municipal e, em regra,
            fica entre 2% e 5%. Benefícios fiscais que reduzam a carga abaixo do
            mínimo exigem análise específica, pois há limitações legais.
          </Paragraph>
          <Paragraph>
            ISS retido deve ser marcado quando o tomador é responsável pela
            retenção, por regra municipal, contrato público, substituição
            tributária ou serviço sujeito à exceção. Marcar indevidamente pode
            gerar imposto não recolhido pelo prestador ou cobrança duplicada.
          </Paragraph>
        </Space>
      ),
    },
    {
      key: "5",
      label: "5. Código do serviço LC 116/2003",
      children: (
        <Paragraph>
          O código deve refletir a atividade real. Para manutenção e assistência
          técnica, costuma-se analisar itens como conserto, manutenção,
          instalação, construção civil ou serviços técnicos, conforme a
          descrição contratada. A classificação define ISS, retenção, município
          competente e descrição exigida pela prefeitura.
        </Paragraph>
      ),
    },
    {
      key: "6",
      label: rotuloAliquotas,
      children: (
        <Table
          size="small"
          dataSource={aliquotasData}
          columns={aliquotasColumns}
          pagination={false}
          scroll={{ x: 760 }}
        />
      ),
    },
    {
      key: "7",
      label: "7. Exemplo prático de nota",
      children: (
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
            <Descriptions.Item label="Valor da NFS-e">
              {formatCurrency(exemplo.base)}
            </Descriptions.Item>
            <Descriptions.Item label="Federais">
              {formatCurrency(exemplo.federais)}
            </Descriptions.Item>
            <Descriptions.Item label="ISS">
              {formatCurrency(exemplo.iss)}
            </Descriptions.Item>
            <Descriptions.Item label="Carga federal">
              {exemplo.cargaFederal.toFixed(2).replace(".", ",")}%
            </Descriptions.Item>
            <Descriptions.Item label="Carga total">
              {exemplo.cargaTotal.toFixed(2).replace(".", ",")}%
            </Descriptions.Item>
            <Descriptions.Item label="Total estimado">
              {formatCurrency(exemplo.total)}
            </Descriptions.Item>
          </Descriptions>
          <Table
            size="small"
            dataSource={exemploData}
            columns={[
              { title: "Tributo", dataIndex: "tributo" },
              { title: "Grupo", dataIndex: "grupo" },
              { title: "Alíquota", dataIndex: "aliquota" },
              { title: "Valor", dataIndex: "valor" },
            ]}
            pagination={false}
          />
        </Space>
      ),
    },
    {
      key: "8",
      label: "8. Reforma Tributária: CBS e IBS",
      children: (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Paragraph>
            A Reforma Tributária cria a CBS federal no lugar de PIS/COFINS e o
            IBS estadual/municipal no lugar de ICMS/ISS. A nota fiscal passará a
            destacar CBS e IBS separadamente, com integração ao ambiente
            nacional e lógica de não cumulatividade ampla.
          </Paragraph>
          <Table
            size="small"
            dataSource={[
              {
                key: "2026",
                periodo: "2026",
                efeito: "Ano de testes para CBS/IBS no documento fiscal.",
                acao: "Preparar campos, layout, integrações e conciliação.",
              },
              {
                key: "2027-2032",
                periodo: "2027 a 2032",
                efeito:
                  "Transição gradual entre tributos atuais e novo modelo.",
                acao: "Manter cálculo paralelo e histórico dos tributos.",
              },
              {
                key: "2033",
                periodo: "2033",
                efeito: "Modelo completo com CBS e IBS.",
                acao: "Operar emissão e apuração no padrão nacional.",
              },
            ]}
            columns={reformaColumns}
            pagination={false}
            scroll={{ x: 680 }}
          />
          <Alert
            type="info"
            showIcon
            message="Impacto para serviços"
            description="Pode haver aumento de carga nominal em serviços com poucos créditos, mas empresas com insumos, materiais, locações e despesas creditáveis poderão aproveitar créditos conforme regulamentação."
          />
        </Space>
      ),
    },
  ];

  return (
    <Card
      bordered={false}
      style={panelStyle}
      bodyStyle={{ padding: compact ? 16 : 20 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <Space align="start">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `${colors.roxo}14`,
              color: colors.roxo,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 19,
              flexShrink: 0,
            }}
          >
            <SafetyCertificateOutlined />
          </div>
          <div>
            <Title
              level={4}
              style={{ marginTop: 0, marginBottom: 4, color: colors.texto }}
            >
              {meta.titulo}
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              {meta.subtitulo}
            </Text>
          </div>
        </Space>
        <Space wrap>
          <Tag
            color={
              config.regime_tributario === meta.regimeEsperado ? "blue" : "gold"
            }
            style={{ borderRadius: 999, fontWeight: 600 }}
          >
            {meta.titulo.replace("Validador fiscal - ", "")}
          </Tag>
          <Tag
            color={
              tipoNota === "nfse" || tipoNota === "ambas" ? "green" : "orange"
            }
            style={{ borderRadius: 999, fontWeight: 600 }}
          >
            {tipoNota === "nfse"
              ? "NFS-e"
              : tipoNota === "ambas"
                ? "NFS-e/NF-e"
                : "Tipo a revisar"}
          </Tag>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <div
            style={{
              border: `1px solid ${colors.borda}`,
              borderRadius: 12,
              padding: 16,
              background: colors.fundoSuave,
            }}
          >
            <Statistic
              title="Carga federal padrão"
              value={11.33}
              precision={2}
              suffix="%"
            />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div
            style={{
              border: `1px solid ${colors.borda}`,
              borderRadius: 12,
              padding: 16,
              background: colors.fundoSuave,
            }}
          >
            <Statistic
              title="ISS configurado"
              value={aliquotaIss}
              precision={2}
              suffix="%"
            />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div
            style={{
              border: `1px solid ${colors.borda}`,
              borderRadius: 12,
              padding: 16,
              background: colors.fundoSuave,
            }}
          >
            <Statistic
              title="Carga estimada total"
              value={exemplo.cargaTotal}
              precision={2}
              suffix="%"
            />
          </div>
        </Col>
      </Row>

      <Space
        direction="vertical"
        style={{ width: "100%", marginBottom: 16 }}
        size={8}
      >
        {validacoes.map((item, index) => (
          <Alert
            key={`${item.message}-${index}`}
            type={item.type}
            showIcon
            message={item.message}
            description={item.description}
            style={{ borderRadius: 10 }}
          />
        ))}
      </Space>

      <Collapse
        bordered={false}
        defaultActiveKey={compact ? ["1", "8"] : ["1", "4", "6", "7", "8"]}
        items={collapseItems}
        style={{
          background: colors.fundoSuave,
          borderRadius: 12,
          border: `1px solid ${colors.borda}`,
        }}
      />

      <Alert
        type="info"
        showIcon
        style={{ marginTop: 16, borderRadius: 10 }}
        message="Base normativa considerada"
        description={
          meta.titulo.includes("Simples Nacional")
            ? "LC 116/2003 e LC 157/2016 para ISS e lista de serviços; legislação do Simples Nacional para anexo e apuração; LC 214/2025 para CBS, IBS e transição da Reforma Tributária. Regras municipais continuam obrigatórias para alíquota, retenção e emissão da NFS-e."
            : meta.titulo.includes("Lucro Real")
              ? "LC 116/2003 e LC 157/2016 para ISS e lista de serviços; legislação contábil e fiscal do Lucro Real; LC 214/2025 para CBS, IBS e transição da Reforma Tributária. Regras municipais continuam obrigatórias para alíquota, retenção e emissão da NFS-e."
              : "LC 116/2003 e LC 157/2016 para ISS e lista de serviços; legislação federal de IRPJ/CSLL no Lucro Presumido; LC 214/2025 para CBS, IBS e transição da Reforma Tributária. Regras municipais continuam obrigatórias para alíquota, retenção e emissão da NFS-e."
        }
      />
    </Card>
  );
}
