import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { CountByClass } from "../types";
import { useAuth } from "../context/AuthContext";

interface Health {
  triples: number;
  fuseki_ok: boolean;
  timescale_ok?: boolean;
  valkey_ok?: boolean;
}

const NAV_CARDS = [
  {
    to: "/ontology",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    color: "bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300",
    title: "Knowledge Graph",
    desc: "Browse classes, properties, and semantic relationships",
  },
  {
    to: "/instances",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
    title: "Grid Assets",
    desc: "Feeders, transformers, substations, and consumers",
  },
  {
    to: "/analytics",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300",
    title: "Analytics",
    desc: "AT&C losses, feeder load, and operational insights",
  },
  {
    to: "/ai",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m0 0V7m0 0h-2m2 10v2a2 2 0 01-2 2h-2m0 0H9m6 0v-2M9 21H7a2 2 0 01-2-2v-2m0 0V15m0 4h2M3 9v6m18-6v6M9 9h6v6H9z" />
      </svg>
    ),
    color: "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300",
    title: "AI Models",
    desc: "Explainable ML predictions for grid operations",
  },
  {
    to: "/sparql",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    color: "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300",
    title: "Query Lab",
    desc: "SPARQL queries directly against the knowledge store",
  },
  {
    to: "/governance",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
    title: "Compliance",
    desc: "OPA policies, SHACL validation, consent management",
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CountByClass[] | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Health>("/health").then(setHealth).catch(() => setHealth(null));
    api<CountByClass[]>("/ontology/stats").then(setStats).catch((e) => setErr(e.message));
  }, []);

  const totalTriples  = health?.triples ?? 0;
  const totalEntities = stats?.reduce((s, r) => s + r.n, 0) ?? 0;
  const classesWithData = stats?.filter((s) => s.n > 0).length ?? 0;
  const maxCount = Math.max(...(stats?.map((s) => s.n) ?? [1]));

  const firstName = user?.full_name
    ? user.full_name.split(" ")[0]
    : user?.email.split("@")[0] ?? "there";

  return (
    <div className="space-y-8 animate-slide-in">

      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Good {timeOfDay()}, {firstName} 👋
          </h1>
          <p className="page-subtitle mt-1 max-w-xl">
            India's semantic energy intelligence platform — explore {totalTriples.toLocaleString()} facts across the grid.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="status-dot status-dot-green status-dot-pulse" />
          <span className="text-xs text-slate-500 dark:text-slate-400">All systems operational</span>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="RDF Triples"
          value={totalTriples.toLocaleString()}
          sub="Facts in the knowledge graph"
          gradient="from-brand-600 to-brand-700"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          }
        />
        <StatCard
          label="Grid Entities"
          value={totalEntities.toLocaleString()}
          sub="Across all asset classes"
          gradient="from-emerald-500 to-emerald-700"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          label="Active Classes"
          value={classesWithData.toString()}
          sub="Classes with instances"
          gradient="from-purple-500 to-purple-700"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatCard
          label="Data Store"
          value={health?.fuseki_ok ? "Online" : "—"}
          sub="Apache Jena Fuseki"
          gradient={health?.fuseki_ok ? "from-amber-500 to-orange-600" : "from-slate-400 to-slate-600"}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          }
        />
      </div>

      {/* ── Quick navigation ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="h2">Explore the platform</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_CARDS.map((c) => (
            <Link key={c.to} to={c.to} className="card-hover group flex items-start gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.color}`}>
                {c.icon}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm group-hover:text-brand-600 transition-colors">{c.title}</div>
                <div className="text-xs muted mt-0.5 leading-relaxed">{c.desc}</div>
              </div>
              <svg className="ml-auto w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-brand-400 transition-colors mt-0.5"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Class distribution ───────────────────────────── */}
      {stats && stats.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="h2">Entity distribution</h2>
              <p className="text-xs muted mt-0.5">Instance count by ontology class</p>
            </div>
            <Link to="/instances"
              className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              View all
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="space-y-3">
            {stats.slice(0, 10).map((s, i) => {
              const pct = maxCount > 0 ? (s.n / maxCount) * 100 : 0;
              const colors = [
                "bg-brand-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500",
                "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
                "bg-violet-500", "bg-pink-500",
              ];
              return (
                <div key={s.class_uri} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium truncate max-w-[60%]">{s.class_name}</span>
                    <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                      {s.n.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${colors[i % colors.length]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {err && (
        <div className="alert-error">
          <strong>Failed to load stats:</strong> {err}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, sub, gradient, icon,
}: {
  label: string; value: string; sub: string;
  gradient: string; icon: React.ReactNode;
}) {
  return (
    <div className={`stat-card bg-gradient-to-br ${gradient} shadow-card-md`}>
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
        <div className="opacity-70">{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      <div className="mt-1 text-xs opacity-70">{sub}</div>
    </div>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
