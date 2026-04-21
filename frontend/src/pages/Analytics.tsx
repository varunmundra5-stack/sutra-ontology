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

  const maxLoss = Math.max(0, ...(atc?.rows.map((r) => r.loss_pct) ?? [0]));
  const maxLoad = Math.max(0, ...(loads?.rows.map((r) => r.total_kwh) ?? [0]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Analytics</h1>
        <p className="muted text-sm mt-1">
          Two starter queries on the graph: AT&C losses by feeder, and total load by feeder.
        </p>
      </div>

      {err && (
        <div className="card border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40">
          <p className="text-sm text-rose-700 dark:text-rose-300">{err}</p>
        </div>
      )}

      {/* AT&C losses */}
      <div className="card">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="h2">AT&C loss by feeder</h2>
            <p className="text-xs muted">Higher bars mean more billed-vs-distributed gap.</p>
          </div>
          <span className="chip">{atc?.count ?? 0} feeders</span>
        </div>
        {!atc ? (
          <div className="muted text-sm">Loading…</div>
        ) : atc.rows.length === 0 ? (
          <div className="muted text-sm">No AT&C records found.</div>
        ) : (
          <div className="space-y-2">
            {atc.rows.slice(0, 15).map((r) => (
              <div key={r.feeder_uri} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-4 text-sm font-medium truncate" title={r.feeder_name}>
                  {r.feeder_name}
                </div>
                <div className="col-span-6 relative h-6 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-rose-500"
                    style={{ width: `${Math.min(100, (r.loss_pct / Math.max(1, maxLoss)) * 100)}%` }}
                  />
                </div>
                <div className="col-span-2 text-right text-sm tabular-nums font-medium">
                  {r.loss_pct.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feeder loads */}
      <div className="card">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="h2">Total feeder load (kWh)</h2>
            <p className="text-xs muted">Summed from all load readings in the graph.</p>
          </div>
          <span className="chip">{loads?.count ?? 0} feeders</span>
        </div>
        {!loads ? (
          <div className="muted text-sm">Loading…</div>
        ) : loads.rows.length === 0 ? (
          <div className="muted text-sm">No load readings yet.</div>
        ) : (
          <div className="space-y-2">
            {loads.rows.slice(0, 15).map((r) => (
              <div key={r.feeder_uri} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-4 text-sm font-medium truncate" title={r.feeder_name}>
                  {r.feeder_name}
                </div>
                <div className="col-span-6 relative h-6 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-400 to-brand-700"
                    style={{ width: `${Math.min(100, (r.total_kwh / Math.max(1, maxLoad)) * 100)}%` }}
                  />
                </div>
                <div className="col-span-2 text-right text-sm tabular-nums font-medium">
                  {Math.round(r.total_kwh).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
