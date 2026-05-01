import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { getStoredAuthState } from "../store/authStore";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const hasStoredToken = Boolean(getStoredAuthState().accessToken);

  if (!isAuthenticated && !hasStoredToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
