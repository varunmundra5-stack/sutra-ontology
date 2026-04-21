import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await register(email, password, fullName || undefined);
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-brand-50 dark:from-slate-950 dark:to-slate-900">
      <div className="card w-full max-w-sm">
        <h1 className="h2 mb-1">Create your account</h1>
        <p className="muted text-sm mb-5">
          New accounts start as <b>viewer</b>. An admin can promote you later.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Full name (optional)</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>
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
            <label className="label">Password (min 6 characters)</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-xs muted text-center">
          Already have one?{" "}
          <Link to="/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
