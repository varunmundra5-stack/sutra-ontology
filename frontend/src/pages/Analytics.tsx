import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AtcLossRow, FeederLoadRow } from "../types";

export default function Analytics() {
  const [atc, setAtc] = useState<{ rows: AtcLossRow[]; count: number } | null>(null);
  const [loads, setLoads] = useState<{ rows: FeederLoadRow[]; count: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<{ rows: AtcLossRow[]; count: number }>("/ontology/analytics/atc-loss")
      .then(setAtc)
      .catch((e) => setErr(e.message));
    api<{ rows: FeederLoadRow[]; count: number }>("/ontology/analytics/feeder-load")
      .then(setLoads)
      .catch((e) => setErr(e.message));
  }, []);

  const maxLoss = Math.max(0.1, ...(atc?.rows.map((r) => r.loss_pct) ?? [0.1]));
  const maxLoad = Math.max(1, ...(loads?.rows.map((r) => r.total_kwh) ?? [1]));
  const avgLoss = atc?.rows.length
    ? atc.rows.reduce((s, r) => s + r.loss_pct, 0) / atc.rows.length
    : 0;
  const totalLoad = loads?.rows.reduce((s, r) => s + r.total_kwh, 0) ?? 0;

  return (
    <div className="space-y-7 animate-slide-in">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">AT&C loss profiles and feeder load distribution across the grid</p>
        </div>
      </div>

      {err && <div className="alert-error">{err}</div>}

      {/* ── Summary stat row ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryTile label="Feeders tracked" value={atc?.count ?? "—"} unit="" color="text-brand-600 dark:text-brand-400" />
        <SummaryTile label="Avg AT&C loss" value={avgLoss.toFixed(1)} unit="%" color="text-rose-600 dark:text-rose-400" />
        <SummaryTile label="Total load" value={Math.round(totalLoad / 1000).toLocaleString()} unit="MWh" color="text-emerald-600 dark:text-emerald-400" />
        <SummaryTile label="Load feeders" value={loads?.count ?? "—"} unit="" color="text-amber-600 dark:text-amber-400" />
      </div>

      {/* ── AT&C Loss chart ──────────────────────────────── */}
      <div className="card">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="h2">AT&C Loss by feeder</h2>
            <p className="text-xs muted mt-0.5">
              Aggregate & Technical + Commercial losses — billed vs distributed gap
            </p>
          </div>
          {atc && (
            <span className="chip">{atc.count} feeders</span>
          )}
        </div>

        {!atc ? (
          <LoadingSkeleton rows={8} />
        ) : atc.rows.length === 0 ? (
          <EmptyState text="No AT&C records found." />
        ) : (
          <div className="space-y-3">
            {atc.rows.slice(0, 15).map((r) => {
              const pct = (r.loss_pct / maxLoss) * 100;
              const severity = r.loss_pct > 20 ? "rose" : r.loss_pct > 12 ? "amber" : "emerald";
              const barColor = severity === "rose"
                ? "from-rose-500 to-rose-600"
                : severity === "amber"
                ? "from-amber-400 to-amber-500"
                : "from-emerald-500 to-emerald-600";
              return (
                <div key={r.feeder_uri} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium truncate max-w-[55%]" title={r.feeder_name}>
                      {r.feeder_name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold tabular-nums ${
                        severity === "rose" ? "text-rose-600 dark:text-rose-400"
                        : severity === "amber" ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {r.loss_pct.toFixed(1)}%
                      </span>
                      <span className={`badge text-[10px] ${
                        severity === "rose" ? "badge-rose"
                        : severity === "amber" ? "badge-amber"
                        : "badge-green"
                      }`}>
                        {severity === "rose" ? "high" : severity === "amber" ? "mid" : "low"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 tabular-nums w-28 text-right shrink-0">
                      {r.billed_kwh.toLocaleString()} / {r.distributed_kwh.toLocaleString()} kWh
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Feeder load chart ────────────────────────────── */}
      <div className="card">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="h2">Total feeder load</h2>
            <p className="text-xs muted mt-0.5">Cumulative energy consumption (kWh)</p>
          </div>
          {loads && (
            <span className="chip">{loads.count} feeders</span>
          )}
        </div>

        {!loads ? (
          <LoadingSkeleton rows={8} />
        ) : loads.rows.length === 0 ? (
          <EmptyState text="No load readings yet." />
        ) : (
          <div className="space-y-3">
            {loads.rows.slice(0, 15).map((r, i) => {
              const pct = (r.total_kwh / maxLoad) * 100;
              const colors = [
                "from-brand-400 to-brand-600",
                "from-cyan-400 to-cyan-600",
                "from-violet-400 to-violet-600",
                "from-teal-400 to-teal-600",
              ];
              return (
                <div key={r.feeder_uri}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium truncate max-w-[55%]">{r.feeder_name}</span>
                    <span className="text-xs font-semibold tabular-nums text-brand-600 dark:text-brand-400">
                      {Math.round(r.total_kwh).toLocaleString()} kWh
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  label, value, unit, color,
}: {
  label: string; value: string | number; unit: string; color: string;
}) {
  return (
    <div className="card text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>
        {value}<span className="text-lg ml-0.5">{unit}</span>
      </div>
      <div className="text-xs muted mt-1">{label}</div>
    </div>
  );
}

function LoadingSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5 animate-pulse">
          <div className="flex justify-between">
            <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
            <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-12" />
          </div>
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded" style={{ width: `${40 + (i * 37) % 60}%` }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm">{text}</p>
    </div>
  );
}
