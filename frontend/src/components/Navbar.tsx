import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Navbar({ open, onClose }: SidebarProps) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `nav-item ${isActive ? "nav-item-active" : "nav-item-default"}`;

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-64 flex flex-col
        bg-[#0d1117] border-r border-[#21262d]
        transition-transform duration-200 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[#21262d] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold text-base shadow-lg shadow-brand-900/40">
            S
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-[#0d1117]" />
          </div>
          <div>
            <div className="font-semibold text-[#e6edf3] text-sm leading-tight tracking-tight">
              Sutra OS
            </div>
            <div className="text-[10px] text-[#4d5566] uppercase tracking-widest">
              Energy Intelligence
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-md text-[#4d5566] hover:text-[#8b949e] hover:bg-[#161b22] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      {user && (
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          <NavSection label="Overview">
            <NavLink to="/dashboard" className={navLink}>
              <IconHome /> Dashboard
            </NavLink>
          </NavSection>

          <NavSection label="Explore">
            <NavLink to="/ontology" className={navLink}>
              <IconGraph /> Knowledge Graph
            </NavLink>
            <NavLink to="/instances" className={navLink}>
              <IconBolt /> Grid Assets
            </NavLink>
            <NavLink to="/analytics" className={navLink}>
              <IconChart /> Analytics
            </NavLink>
            <NavLink to="/sparql" className={navLink}>
              <IconCode /> Query Lab
            </NavLink>
          </NavSection>

          <NavSection label="Intelligence">
            <NavLink to="/ai" className={navLink}>
              <IconCpu /> AI Models
            </NavLink>
          </NavSection>

          {(hasRole("admin", "editor") || hasRole("admin")) && (
            <NavSection label="System">
              {hasRole("admin", "editor") && (
                <NavLink to="/governance" className={navLink}>
                  <IconShield /> Compliance
                </NavLink>
              )}
              {hasRole("admin") && (
                <NavLink to="/admin" className={navLink}>
                  <IconUsers /> Admin
                </NavLink>
              )}
            </NavSection>
          )}
        </nav>
      )}

      {/* ── User Section ─────────────────────────────────── */}
      {user && (
        <div className="shrink-0 border-t border-[#21262d] px-3 py-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#161b22] mb-2">
            <div
              className={`
                flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                text-xs font-bold text-white
                ${roleAvatarBg(user.role)}
              `}
            >
              {(user.full_name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#e6edf3] truncate">
                {user.full_name ?? user.email.split("@")[0]}
              </div>
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${roleTextColor(user.role)}`}>
                {user.role}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-3">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-[#4d5566] hover:text-[#8b949e] transition-colors py-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="nav-section-label">{label}</div>
      {children}
    </div>
  );
}

function roleAvatarBg(role: string) {
  switch (role) {
    case "admin":   return "bg-rose-600";
    case "editor":  return "bg-amber-600";
    default:        return "bg-emerald-700";
  }
}

function roleTextColor(role: string) {
  switch (role) {
    case "admin":   return "text-rose-400";
    case "editor":  return "text-amber-400";
    default:        return "text-emerald-400";
  }
}

// ── Icons (Heroicons outline style) ──────────────────────────

const IconHome = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const IconGraph = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const IconBolt = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const IconChart = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconCode = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const IconCpu = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m0 0V7m0 0h-2m2 10v2a2 2 0 01-2 2h-2m0 0H9m6 0v-2M9 21H7a2 2 0 01-2-2v-2m0 0V15m0 4h2M3 9v6m18-6v6M9 9h6v6H9z" />
  </svg>
);

const IconShield = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const IconUsers = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
