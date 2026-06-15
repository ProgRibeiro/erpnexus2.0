import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { getStoredAuthState } from "../store/authStore";

const ROTAS_COMUNS = ["/perfil", "/tecnico-mobile", "/loja", "/orcamentos/unificado"];

function moduloUsuario(user) {
  if (user?.is_superuser) return "ambos";
  return user?.modulo || "erp";
}

function podeAcessarProduto(user, pathname) {
  const modulo = moduloUsuario(user);
  const isFacilities = pathname.startsWith("/facilities");
  const isComum = ROTAS_COMUNS.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));

  if (modulo === "ambos" || isComum) return true;
  if (isFacilities) return modulo === "facilities";
  return modulo === "erp";
}

function destinoPermitido(user) {
  const modulo = moduloUsuario(user);
  return modulo === "facilities" ? "/facilities" : "/dashboard";
}

export default function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const storedAuth = getStoredAuthState();
  const hasStoredToken = Boolean(storedAuth.accessToken);
  const currentUser = user || storedAuth.user;

  if (!isAuthenticated && !hasStoredToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (currentUser && !podeAcessarProduto(currentUser, location.pathname)) {
    return <Navigate to={destinoPermitido(currentUser)} replace />;
  }

  return <Outlet />;
}
