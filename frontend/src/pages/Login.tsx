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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-brand-50 dark:from-slate-950 dark:to-slate-900">
      <div className="card w-full max-w-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
            S
          </div>
          <div>
            <h1 className="h2">Sutra OS</h1>
            <p className="text-xs muted">Energy Ontology platform</p>
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-1">Welcome back</h2>
        <p className="muted text-sm mb-5">Sign in to explore the ontology.</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              minLength={6}
            />
          </div>
          {err && (
            <div className="text-sm rounded-md border border-rose-300 bg-rose-50 p-2 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {err}
            </div>
          )}
          <button disabled={busy} className="btn btn-primary w-full" type="submit">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-xs muted text-center">
          No account?{" "}
          <Link to="/register" className="text-brand-600 hover:underline">
            Create one
          </Link>
        </p>
        <p className="mt-3 text-xs muted text-center">
          Demo admin: <code>admin@sutra.local</code> / <code>admin123</code>
        </p>
      </div>
    </div>
  );
}
