import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Role, User } from "../types";

const ROLES: Role[] = ["admin", "editor", "viewer"];

const ROLE_CONFIG = {
  admin:  { badge: "badge-rose",  label: "Admin",  desc: "Full access" },
  editor: { badge: "badge-amber", label: "Editor", desc: "Write + ingest" },
  viewer: { badge: "badge-green", label: "Viewer", desc: "Read only" },
};

export default function Admin() {
  const [users, setUsers]   = useState<User[] | null>(null);
  const [err, setErr]       = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg]       = useState<string | null>(null);

  async function load() {
    setErr(null);
    try { setUsers(await api<User[]>("/auth/users")); }
    catch (e: any) { setErr(e?.message ?? "Failed to load users"); }
  }

  useEffect(() => { load(); }, []);

  async function changeRole(u: User, role: Role) {
    if (u.role === role) return;
    setBusyId(u.id); setMsg(null);
    try {
      await api(`/auth/users/${u.id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      setMsg(`Updated ${u.email} → ${role}`);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Role update failed");
    } finally { setBusyId(null); }
  }

  return (
    <div className="space-y-7 animate-slide-in">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle">Manage user access levels and roles</p>
        </div>
        <span className="chip">{users?.length ?? 0} users</span>
      </div>

      {err && <div className="alert-error">{err}</div>}
      {msg && <div className="alert-success">{msg}</div>}

      {/* ── Role legend ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {ROLES.map((r) => {
          const cfg = ROLE_CONFIG[r];
          return (
            <div key={r} className="card flex items-center gap-3 py-3">
              <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
              <span className="text-xs muted">{cfg.desc}</span>
            </div>
          );
        })}
      </div>

      {/* ── Users table ──────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h2 className="font-semibold text-sm">Platform users</h2>
        </div>

        {!users ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-slate-50 dark:bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm muted">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto">
              <thead>
                <tr>
                  <th className="th">User</th>
                  <th className="th">Role</th>
                  <th className="th">Change role</th>
                  <th className="th">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isBusy = busyId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                            u.role === "admin" ? "bg-rose-600"
                            : u.role === "editor" ? "bg-amber-600"
                            : "bg-emerald-700"
                          }`}>
                            {(u.full_name ?? u.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{u.full_name ?? "—"}</div>
                            <div className="text-xs muted">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <span className={`badge ${ROLE_CONFIG[u.role as Role]?.badge ?? "badge-slate"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex gap-1.5">
                          {ROLES.map((r) => (
                            <button
                              key={r}
                              disabled={isBusy || u.role === r}
                              onClick={() => changeRole(u, r)}
                              className={`
                                rounded-md border px-2.5 py-1 text-xs font-medium transition-all
                                ${u.role === r
                                  ? "border-brand-600 bg-brand-600 text-white cursor-default"
                                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-700 dark:hover:text-brand-400"
                                }
                                disabled:opacity-50 disabled:cursor-not-allowed
                              `}
                            >
                              {isBusy && u.role !== r ? (
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : r}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="td text-xs muted">
                        {new Date(u.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
