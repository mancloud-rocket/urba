import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./primitives";

export default function RequireAuth() {
  const { session, loading, isConfigured } = useAuth();

  if (!isConfigured) return <Outlet />;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={24} />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
