import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ClassInfo, Instance, InstancesResponse } from "../types";

export default function Instances() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [data, setData] = useState<InstancesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<ClassInfo[]>("/ontology/classes")
      .then((cs) => {
        setClasses(cs);
        // Pick a likely-populated class by default
        const pref = cs.find((c) => /Transformer|Feeder|Consumer/.test(c.local_name)) ?? cs[0];
        if (pref) setSelected(pref.uri);
      })
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setErr(null);
    api<InstancesResponse>(`/ontology/instances?class_uri=${encodeURIComponent(selected)}&limit=50`)
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [selected]);

  const selectedCls = classes.find((c) => c.uri === selected);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="h1">Grid Assets</h1>
        <p className="muted text-sm mt-1">
          Pick a class to see real instances — transformers, feeders, consumers, readings, and more.
        </p>
      </div>

      <div className="card">
        <label className="label">Class</label>
        <select
          className="input"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {classes.map((c) => (
            <option key={c.uri} value={c.uri}>
              {c.label ?? c.local_name} — {c.local_name}
            </option>
          ))}
        </select>
        {selectedCls?.comment && <p className="text-xs muted mt-2">{selectedCls.comment}</p>}
      </div>

      {err && (
        <div className="card border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40">
          <p className="text-sm text-rose-700 dark:text-rose-300">{err}</p>
        </div>
      )}

      {loading && <div className="muted text-sm">Loading instances…</div>}

      {data && !loading && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="h2">
              {data.count} {data.count === 1 ? "instance" : "instances"}
            </h2>
            <div className="text-xs muted">Showing up to 50</div>
          </div>
          {data.count === 0 ? (
            <div className="p-8 text-center muted text-sm">
              No instances of this class yet. Try a different class.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.instances.map((inst) => (
                <InstanceRow key={String(inst.uri)} inst={inst} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InstanceRow({ inst }: { inst: Instance }) {
  const kvs = Object.entries(inst).filter(([k]) => k !== "uri" && k !== "local_name");
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">{String(inst.local_name ?? "")}</div>
          <div className="text-xs muted break-all">{String(inst.uri)}</div>
        </div>
      </div>
      {kvs.length > 0 && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-sm">
          {kvs.map(([k, v]) => (
            <div key={k} className="flex gap-2 min-w-0">
              <span className="muted shrink-0">{k}:</span>
              <span className="truncate" title={String(Array.isArray(v) ? v.join(", ") : v)}>
                {Array.isArray(v) ? v.join(", ") : String(v)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
