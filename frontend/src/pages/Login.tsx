import { useState, FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("admin@sutra.local");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await login(email, password);
      const dest = (loc.state as any)?.from ?? "/dashboard";
      navigate(dest, { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  const demoUsers = [
    { label: "Admin", email: "admin@sutra.local", password: "admin123", color: "rose" },
    { label: "Editor", email: "editor@sutra.local", password: "editor123", color: "amber" },
    { label: "Viewer", email: "viewer@sutra.local", password: "viewer123", color: "emerald" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — brand ─────────────────────────────── */}
      <div className="hidden lg:flex w-[55%] flex-col justify-between bg-[#0d1117] px-14 py-12 relative overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold text-lg shadow-xl shadow-brand-900/50">
            S
          </div>
          <div>
            <div className="font-semibold text-white text-base">Sutra OS</div>
            <div className="text-[10px] text-[#4d5566] uppercase tracking-widest">Energy Intelligence</div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              India's Energy<br />Knowledge Graph
            </h1>
            <p className="mt-4 text-[#8b949e] text-lg leading-relaxed max-w-sm">
              Semantic intelligence for grid operations, AT&C loss analytics, and compliance — all in one platform.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { icon: "⚡", text: "Grid Asset Registry" },
              { icon: "📊", text: "AT&C Loss Analytics" },
              { icon: "🛡️", text: "OPA Policy Engine" },
              { icon: "🤖", text: "EBM AI Models" },
              { icon: "🔗", text: "SPARQL Query Lab" },
            ].map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-[#8b949e]"
              >
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            {[
              { n: "12K+", label: "RDF Triples" },
              { n: "2.5K", label: "Grid Entities" },
              { n: "13", label: "Asset Classes" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-white">{s.n}</div>
                <div className="text-xs text-[#4d5566] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-xs text-[#4d5566]">
          Open-source · Fuseki · TimescaleDB · Valkey · OPA · FastAPI
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-slate-50 dark:bg-[#0d1117] lg:bg-white lg:dark:bg-slate-950">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-base">S</div>
          <div className="font-semibold text-lg">Sutra OS</div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Sign in to your workspace
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="input-group">
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="input-group">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            {err && (
              <div className="alert-error flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {err}
              </div>
            )}

            <button disabled={busy} className="btn btn-primary w-full btn-lg mt-1" type="submit">
              {busy ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-5 text-sm text-center text-slate-500 dark:text-slate-400">
            No account?{" "}
            <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium hover:underline">
              Create one
            </Link>
          </p>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-center text-slate-400 mb-3">Demo accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {demoUsers.map((u) => (
                <button
                  key={u.label}
                  type="button"
                  onClick={() => { setEmail(u.email); setPassword(u.password); }}
                  className={`
                    rounded-lg border px-2.5 py-2 text-xs font-medium transition-all
                    hover:shadow-sm
                    ${u.color === "rose"
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
                      : u.color === "amber"
                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                    }
                  `}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
