import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { CountByClass } from "../types";

export default function Dashboard() {
  const [stats, setStats] = useState<CountByClass[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [health, setHealth] = useState<{ triples: number; fuseki_ok: boolean } | null>(null);

  useEffect(() => {
    api<{ triples: number; fuseki_ok: boolean }>("/health")
      .then(setHealth)
      .catch(() => setHealth(null));
    api<CountByClass[]>("/ontology/stats").then(setStats).catch((e) => setErr(e.message));
  }, []);

  const totalTriples = health?.triples ?? 0;
  const totalEntities = stats?.reduce((s, r) => s + r.n, 0) ?? 0;
  const classesWithData = stats?.filter((s) => s.n > 0).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Welcome to Sutra OS</h1>
        <p className="muted mt-1">
          The knowledge graph for India's energy sector. Explore classes, query instances,
          and audit carbon credits — all from one place.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total triples" value={totalTriples.toLocaleString()} hint="Facts in the knowledge graph" />
        <StatCard title="Total entities" value={totalEntities.toLocaleString()} hint="Concrete instances across all classes" />
        <StatCard title="Active classes" value={classesWithData.toString()} hint="Classes with at least one instance" />
      </div>

      {/* Quick links */}
      <div>
        <h2 className="h2 mb-3">What would you like to do?</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <QuickCard
            emoji="📘"
            title="Browse the Knowledge Graph"
            desc="See every class and property in plain language."
            to="/ontology"
          />
          <QuickCard
            emoji="🔎"
            title="Find Grid Assets"
            desc="Look up transformers, feeders, consumers, and more."
            to="/instances"
          />
          <QuickCard
            emoji="📊"
            title="Run analytics"
            desc="AT&C losses, feeder loads, and other insights."
            to="/analytics"
          />
          <QuickCard
            emoji="🧪"
            title="Query Lab"
            desc="For power users: write queries directly."
            to="/sparql"
          />
        </div>
      </div>

      {/* Top classes */}
      {stats && stats.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="h2">Biggest classes by instance count</h2>
            <Link to="/instances" className="text-sm text-brand-600 hover:underline">
              Explore →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left muted">
                  <th className="py-2 pr-4">Class</th>
                  <th className="py-2 pr-4">Instances</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.slice(0, 8).map((s) => (
                  <tr key={s.class_uri}>
                    <td className="py-2 pr-4 font-medium">{s.class_name}</td>
                    <td className="py-2 pr-4">{s.n.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {err && (
        <div className="card border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40">
          <p className="text-sm text-rose-700 dark:text-rose-300">Failed to load stats: {err}</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="card">
      <div className="text-xs muted uppercase tracking-wide">{title}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-xs muted mt-1">{hint}</div>
    </div>
  );
}

function QuickCard({
  emoji,
  title,
  desc,
  to,
}: {
  emoji: string;
  title: string;
  desc: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="card hover:border-brand-400 hover:shadow-md transition-all group"
    >
      <div className="text-2xl">{emoji}</div>
      <div className="mt-2 font-semibold">{title}</div>
      <div className="text-sm muted mt-1">{desc}</div>
      <div className="mt-3 text-xs text-brand-600 group-hover:translate-x-0.5 transition-transform">
        Open →
      </div>
    </Link>
  );
}
