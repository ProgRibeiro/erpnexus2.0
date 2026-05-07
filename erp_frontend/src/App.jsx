import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import BottomNavigationBar from "./components/BottomNavigationBar";
import { useBootstrapAuth } from "./hooks/useBootstrapAuth";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import ClientesPage from "./pages/ClientesPage";
import CRMPage from "./pages/CRM";
import AgendaPage from "./pages/Agenda";
import MinhasOSHojePage from "./pages/Agenda/MinhasOSHoje";
import ConfiguracoesPage from "./pages/Configuracoes";
import ContasBancariasPage from "./pages/Financeiro/ContasBancarias";
import FinanceiroDashboard from "./pages/Financeiro/Dashboard";
import LancamentosPage from "./pages/Financeiro/Lancamentos";
import NovoLancamentoPage from "./pages/Financeiro/NovoLancamento";
import RelatoriosFinanceirosPage from "./pages/Financeiro/Relatorios";
import RelatorioPublicoPage from "./pages/RelatorioPublico";
import AlertasEstoquePage from "./pages/Estoque/Alertas";
import EntradaEstoquePage from "./pages/Estoque/EntradaEstoque";
import EstoquePage from "./pages/Estoque";
import ProdutoDetalhePage from "./pages/Estoque/ProdutoDetalhe";
import SaidaEstoquePage from "./pages/Estoque/SaidaEstoque";
import LoginPage from "./pages/Auth/LoginPage";
import NovaOS from "./pages/Ordens/NovaOS";
import OrdensPage from "./pages/Ordens/OrdensPage";
import OSDetalhe from "./pages/Ordens/OSDetalhe";
import OrcamentoDetalhe from "./pages/Orcamentos/OrcamentoDetalhe";
import ImpressaoOrcamento from "./pages/Orcamentos/ImpressaoOrcamento";
import NovoOrcamento from "./pages/Orcamentos/NovoOrcamento";
import OrcamentoUnificado from "./pages/Orcamentos/OrcamentoUnificado";
import OrcamentosPage from "./pages/Orcamentos/OrcamentosPage";
import ContratosPage from "./pages/Contratos";
import NovoContrato from "./pages/Contratos/NovoContrato";
import ContratoDetalhe from "./pages/Contratos/ContratoDetalhe";
import ProfilePage from "./pages/ProfilePage";
import TecnicoMobilePage from "./pages/TecnicoMobile";
import OSCampoPage from "./pages/TecnicoMobile/OSCampo";
import FiscalPage from "./pages/Fiscal";
import FaturamentoPage from "./pages/Faturamento";
import ServicosPage from "./pages/Servicos";
import TerceirosPage from "./pages/Terceiros";
import PortalTerceiroPage from "./pages/Terceiros/PortalTerceiro";
import LojaPage from "./pages/Loja";
import FacilitiesDashboard from "./pages/Facilities";
import AtivosPage from "./pages/Facilities/Ativos";
import AtivoDetalhe from "./pages/Facilities/Ativos/AtivoDetalhe";
import ChamadosFacilities from "./pages/Facilities/Chamados";
import PMPPage from "./pages/Facilities/PMP";
import ContratosFacilities from "./pages/Facilities/Contratos";
import ObrasPage from "./pages/Facilities/Obras";
import ObraDetalhe from "./pages/Facilities/Obras/ObraDetalhe";
import IndicadoresFacilities from "./pages/Facilities/Indicadores";
import UnidadesPage from "./pages/Facilities/Unidades";
import BudgetPage from "./pages/Facilities/Budget";
import AprovacoesPage from "./pages/Facilities/Aprovacoes";
import ChamadosExternosPage from "./pages/ChamadosExternos";
import LicitacoesPage from "./pages/Licitacoes";
import LicitacaoFacilitiesPage from "./pages/Facilities/Licitacao";
import FacilitiesConfiguracoesPage from "./pages/Facilities/Configuracoes";
import EquipePage from "./pages/Equipe";
import MasterLoginPage from "./pages/MasterAdmin/MasterLoginPage";
import MasterLayout from "./pages/MasterAdmin/MasterLayout";
import MasterDashboardPage from "./pages/MasterAdmin/MasterDashboardPage";
import MasterClientesPage from "./pages/MasterAdmin/MasterClientesPage";
import MasterPlanosPage from "./pages/MasterAdmin/MasterPlanosPage";
import MasterPagamentosPage from "./pages/MasterAdmin/MasterPagamentosPage";
import MasterLogsPage from "./pages/MasterAdmin/MasterLogsPage";

export default function App() {
  useBootstrapAuth();

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/master/login" element={<MasterLoginPage />} />
        <Route path="/master" element={<MasterLayout />}>
          <Route index element={<MasterDashboardPage />} />
          <Route path="dashboard" element={<MasterDashboardPage />} />
          <Route path="clientes" element={<MasterClientesPage />} />
          <Route path="planos" element={<MasterPlanosPage />} />
          <Route path="pagamentos" element={<MasterPagamentosPage />} />
          <Route path="logs" element={<MasterLogsPage />} />
        </Route>
        <Route path="/relatorio/:token" element={<RelatorioPublicoPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/tecnico-mobile" element={<TecnicoMobilePage />} />
          <Route path="/tecnico-mobile/os-campo/:osId" element={<OSCampoPage />} />
          <Route path="/loja" element={<LojaPage />} />
          <Route path="/orcamentos/unificado" element={<OrcamentoUnificado />} />
          <Route path="/orcamentos/:id/impressao" element={<ImpressaoOrcamento />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/ordens" element={<OrdensPage />} />
            <Route path="/ordens/novo" element={<NovaOS />} />
            <Route path="/ordens/:id" element={<OSDetalhe />} />
            <Route path="/orcamentos" element={<OrcamentosPage />} />
            <Route path="/orcamentos/novo" element={<NovoOrcamento />} />
            <Route path="/orcamentos/:id" element={<OrcamentoDetalhe />} />
            <Route path="/contratos" element={<ContratosPage />} />
            <Route path="/contratos/novo" element={<NovoContrato />} />
            <Route path="/contratos/:id" element={<ContratoDetalhe />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/agenda/hoje" element={<MinhasOSHojePage />} />
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/financeiro" element={<FinanceiroDashboard />} />
            <Route path="/financeiro/lancamentos" element={<LancamentosPage />} />
            <Route path="/financeiro/lancamentos/novo" element={<NovoLancamentoPage />} />
            <Route path="/financeiro/lancamentos/:id" element={<NovoLancamentoPage />} />
            <Route path="/financeiro/contas" element={<ContasBancariasPage />} />
            <Route path="/financeiro/relatorios" element={<RelatoriosFinanceirosPage />} />
            <Route path="/estoque" element={<EstoquePage />} />
            <Route path="/estoque/produtos/:id" element={<ProdutoDetalhePage />} />
            <Route path="/estoque/entrada" element={<EntradaEstoquePage />} />
            <Route path="/estoque/saida" element={<SaidaEstoquePage />} />
            <Route path="/estoque/alertas" element={<AlertasEstoquePage />} />
            <Route path="/servicos" element={<ServicosPage />} />
            <Route path="/terceiros" element={<TerceirosPage />} />
            <Route path="/terceiros/portal" element={<PortalTerceiroPage />} />
            <Route path="/fiscal" element={<FiscalPage />} />
            <Route path="/faturamento" element={<FaturamentoPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/facilities" element={<FacilitiesDashboard />} />
            <Route path="/facilities/ativos" element={<AtivosPage />} />
            <Route path="/facilities/ativos/:id" element={<AtivoDetalhe />} />
            <Route path="/facilities/chamados" element={<ChamadosFacilities />} />
            <Route path="/facilities/pmp" element={<PMPPage />} />
            <Route path="/facilities/contratos" element={<ContratosFacilities />} />
            <Route path="/facilities/obras" element={<ObrasPage />} />
            <Route path="/facilities/obras/:id" element={<ObraDetalhe />} />
            <Route path="/facilities/indicadores" element={<IndicadoresFacilities />} />
            <Route path="/facilities/unidades" element={<UnidadesPage />} />
            <Route path="/facilities/budget" element={<BudgetPage />} />
            <Route path="/facilities/aprovacoes" element={<AprovacoesPage />} />
            <Route path="/facilities/licitacao" element={<LicitacaoFacilitiesPage />} />
            <Route path="/facilities/configuracoes" element={<FacilitiesConfiguracoesPage />} />
            <Route path="/chamados-externos" element={<ChamadosExternosPage />} />
            <Route path="/licitacoes" element={<LicitacoesPage />} />
            <Route path="/equipe" element={<EquipePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNavigationBar />
    </>
  );
}
