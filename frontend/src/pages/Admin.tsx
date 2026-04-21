import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Role, User } from "../types";

const ROLES: Role[] = ["admin", "editor", "viewer"];

export default function Admin() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const u = await api<User[]>("/auth/users");
      setUsers(u);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load users");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(u: User, role: Role) {
    if (u.role === role) return;
    setBusyId(u.id);
    setMsg(null);
    try {
      await api(`/auth/users/${u.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setMsg(`Updated ${u.email} → ${role}`);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Role update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="h1">Admin</h1>
        <p className="muted text-sm mt-1">
          Manage user roles. Admins have full access, editors can write + mint credits,
          viewers are read-only.
        </p>
      </div>

      {err && (
        <div className="card border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40">
          <p className="text-sm text-rose-700 dark:text-rose-300">{err}</p>
        </div>
      )}
      {msg && (
        <div className="card border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">{msg}</p>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="h2">Users</h2>
          <span className="chip">{users?.length ?? 0} total</span>
        </div>
        {!users ? (
          <div className="p-6 text-sm muted">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm muted">No users yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left muted border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 px-4">Email</th>
                  <th className="py-2 px-4">Name</th>
                  <th className="py-2 px-4">Role</th>
                  <th className="py-2 px-4">Change role</th>
                  <th className="py-2 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2 px-4 font-medium">{u.email}</td>
                    <td className="py-2 px-4">{u.full_name ?? "—"}</td>
                    <td className="py-2 px-4">
                      <span className={`badge ${roleColor(u.role)}`}>{u.role}</span>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex gap-1">
                        {ROLES.map((r) => (
                          <button
                            key={r}
                            disabled={busyId === u.id || u.role === r}
                            onClick={() => changeRole(u, r)}
                            className={`chip cursor-pointer text-xs ${
                              u.role === r ? "!bg-brand-600 !text-white !border-brand-600" : ""
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-xs muted">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function roleColor(role: Role) {
  switch (role) {
    case "admin":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200";
    case "editor":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200";
    default:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200";
  }
}
