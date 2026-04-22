import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { ClassInfo, PropertyInfo } from "../types";

export default function Ontology() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [props, setProps] = useState<PropertyInfo[]>([]);
  const [tab, setTab] = useState<"classes" | "properties">("classes");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ClassInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<ClassInfo[]>("/ontology/classes").then(setClasses).catch((e) => setErr(e.message));
    api<PropertyInfo[]>("/ontology/properties").then(setProps).catch((e) => setErr(e.message));
  }, []);

  const filteredClasses = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return classes;
    return classes.filter(
      (c) =>
        c.local_name.toLowerCase().includes(s) ||
        (c.label ?? "").toLowerCase().includes(s) ||
        (c.comment ?? "").toLowerCase().includes(s)
    );
  }, [classes, q]);

  const filteredProps = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return props;
    return props.filter(
      (p) =>
        p.local_name.toLowerCase().includes(s) ||
        (p.label ?? "").toLowerCase().includes(s)
    );
  }, [props, q]);

  // Properties tied to the selected class (domain or range matches class URI)
  const relatedProps = useMemo(() => {
    if (!selected) return [];
    return props.filter((p) => p.domain === selected.uri || p.range === selected.uri);
  }, [selected, props]);

  return (
    <div className="space-y-5 animate-slide-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Knowledge Graph</h1>
          <p className="page-subtitle mt-1">
            Classes are <em>things</em> (e.g. Transformer) · Properties are <em>facts</em> about things
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search classes, properties…"
            className="input w-64 md:w-80"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className={`chip cursor-pointer ${tab === "classes" ? "!bg-brand-600 !text-white !border-brand-600" : ""}`}
          onClick={() => setTab("classes")}
        >
          Classes ({classes.length})
        </button>
        <button
          className={`chip cursor-pointer ${tab === "properties" ? "!bg-brand-600 !text-white !border-brand-600" : ""}`}
          onClick={() => setTab("properties")}
        >
          Properties ({props.length})
        </button>
      </div>

      {err && (
        <div className="card border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40">
          <p className="text-sm text-rose-700 dark:text-rose-300">{err}</p>
        </div>
      )}

      {tab === "classes" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 card p-0 overflow-hidden">
            <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClasses.map((c) => (
                <button
                  key={c.uri}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    selected?.uri === c.uri ? "bg-brand-50 dark:bg-brand-900/20" : ""
                  }`}
                >
                  <div className="font-medium">{c.label ?? c.local_name}</div>
                  <div className="text-xs muted truncate">{c.local_name}</div>
                </button>
              ))}
              {filteredClasses.length === 0 && (
                <div className="p-6 text-center text-sm muted">No classes match "{q}".</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 card">
            {selected ? (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs muted">Class</div>
                    <h2 className="h2">{selected.label ?? selected.local_name}</h2>
                    <div className="text-xs muted mt-1 break-all">{selected.uri}</div>
                  </div>
                </div>
                {selected.comment && (
                  <p className="mt-3 text-sm leading-relaxed">{selected.comment}</p>
                )}
                <div className="mt-5">
                  <h3 className="font-semibold text-sm mb-2">Related properties</h3>
                  {relatedProps.length === 0 ? (
                    <p className="text-xs muted">No properties declare this class in domain or range.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left muted">
                            <th className="py-2 pr-3">Property</th>
                            <th className="py-2 pr-3">Kind</th>
                            <th className="py-2 pr-3">Direction</th>
                            <th className="py-2 pr-3">Other side</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {relatedProps.map((p) => {
                            const dir = p.domain === selected.uri ? "from" : "to";
                            const other =
                              p.domain === selected.uri ? p.range : p.domain;
                            return (
                              <tr key={p.uri}>
                                <td className="py-2 pr-3 font-medium">{p.label ?? p.local_name}</td>
                                <td className="py-2 pr-3">{p.type}</td>
                                <td className="py-2 pr-3">{dir}</td>
                                <td className="py-2 pr-3 text-xs muted break-all">{other ?? "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center muted text-sm">
                Pick a class on the left to see what it is and how it connects.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left muted border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 px-4">Property</th>
                  <th className="py-2 px-4">Kind</th>
                  <th className="py-2 px-4">Domain</th>
                  <th className="py-2 px-4">Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProps.map((p) => (
                  <tr key={p.uri}>
                    <td className="py-2 px-4 font-medium">{p.label ?? p.local_name}</td>
                    <td className="py-2 px-4">
                      <span
                        className={`badge ${
                          p.type === "object"
                            ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                        }`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-xs muted break-all">{lastSeg(p.domain)}</td>
                    <td className="py-2 px-4 text-xs muted break-all">{lastSeg(p.range)}</td>
                  </tr>
                ))}
                {filteredProps.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center muted">
                      No properties match "{q}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function lastSeg(uri: string | null) {
  if (!uri) return "—";
  const sep = uri.includes("#") ? "#" : "/";
  return uri.split(sep).pop() ?? uri;
}
