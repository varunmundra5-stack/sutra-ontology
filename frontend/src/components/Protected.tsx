import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

export function Protected({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center muted">
        Loading your session…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="card max-w-lg mx-auto mt-10 text-center">
        <h2 className="h2 mb-2">Access denied</h2>
        <p className="muted text-sm">
          This page requires one of these roles: <b>{roles.join(", ")}</b>. Your role is{" "}
          <b>{user.role}</b>.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
