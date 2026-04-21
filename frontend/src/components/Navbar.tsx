import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
            S
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">Sutra OS</span>
            <span className="text-xs muted">Energy Ontology</span>
          </div>
        </div>

        {user && (
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/dashboard" className={linkClass}>
              Home
            </NavLink>
            <NavLink to="/ontology" className={linkClass}>
              Ontology
            </NavLink>
            <NavLink to="/instances" className={linkClass}>
              Entities
            </NavLink>
            <NavLink to="/analytics" className={linkClass}>
              Analytics
            </NavLink>
            <NavLink to="/sparql" className={linkClass}>
              SPARQL
            </NavLink>
            {hasRole("admin", "editor") && (
              <NavLink to="/governance" className={linkClass}>
                Governance
              </NavLink>
            )}
            {hasRole("admin") && (
              <NavLink to="/admin" className={linkClass}>
                Admin
              </NavLink>
            )}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-xs font-medium">{user.full_name ?? user.email}</span>
                <span className={`badge ${roleColor(user.role)}`}>{user.role}</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="btn btn-outline"
              >
                Sign out
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="btn btn-primary">
              Sign in
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

function roleColor(role: string) {
  switch (role) {
    case "admin":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200";
    case "editor":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200";
    default:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200";
  }
}
