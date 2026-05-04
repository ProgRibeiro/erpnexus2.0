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
import OrcamentosPage from "./pages/Orcamentos/OrcamentosPage";
import ProfilePage from "./pages/ProfilePage";
import TecnicoMobilePage from "./pages/TecnicoMobile";
import OSCampoPage from "./pages/TecnicoMobile/OSCampo";
import FiscalPage from "./pages/Fiscal";
import FaturamentoPage from "./pages/Faturamento";
import ServicosPage from "./pages/Servicos";
import TerceirosPage from "./pages/Terceiros";
import PortalTerceiroPage from "./pages/Terceiros/PortalTerceiro";

export default function App() {
  useBootstrapAuth();

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/relatorio/:token" element={<RelatorioPublicoPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/tecnico-mobile" element={<TecnicoMobilePage />} />
          <Route path="/tecnico-mobile/os-campo/:osId" element={<OSCampoPage />} />
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
            <Route path="/orcamentos/:id/impressao" element={<ImpressaoOrcamento />} />
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
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNavigationBar />
    </>
  );
}
