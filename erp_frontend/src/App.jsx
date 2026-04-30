import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { useBootstrapAuth } from "./hooks/useBootstrapAuth";
import DashboardPage from "./pages/DashboardPage";
import ClientesPage from "./pages/ClientesPage";
import CRMPage from "./pages/CRM";
import ContasBancariasPage from "./pages/Financeiro/ContasBancarias";
import FinanceiroDashboard from "./pages/Financeiro/Dashboard";
import LancamentosPage from "./pages/Financeiro/Lancamentos";
import NovoLancamentoPage from "./pages/Financeiro/NovoLancamento";
import RelatoriosFinanceirosPage from "./pages/Financeiro/Relatorios";
import AlertasEstoquePage from "./pages/Estoque/Alertas";
import EntradaEstoquePage from "./pages/Estoque/EntradaEstoque";
import EstoquePage from "./pages/Estoque";
import ProdutoDetalhePage from "./pages/Estoque/ProdutoDetalhe";
import SaidaEstoquePage from "./pages/Estoque/SaidaEstoque";
import LoginPage from "./pages/LoginPage";
import OrdensPage from "./pages/OrdensPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  useBootstrapAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/ordens" element={<OrdensPage />} />
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
          <Route path="/perfil" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
