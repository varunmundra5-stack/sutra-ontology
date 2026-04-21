import { useState } from "react";
import { api } from "../lib/api";

const EXAMPLES: { title: string; q: string }[] = [
  {
    title: "All transformers",
    q: `PREFIX es: <https://ontology.energystack.in/core#>
SELECT ?s ?rating ?voltage WHERE {
  ?s a es:Transformer ;
     es:ratingKva ?rating ;
     es:voltageLevel ?voltage .
} LIMIT 20`,
  },
  {
    title: "Top 10 lossy feeders",
    q: `PREFIX es: <https://ontology.energystack.in/core#>
SELECT ?feeder ?loss WHERE {
  ?rec a es:ATCLossRecord ;
       es:feederRef ?feeder ;
       es:lossPct ?loss .
} ORDER BY DESC(?loss) LIMIT 10`,
  },
  {
    title: "Count instances per class",
    q: `PREFIX es: <https://ontology.energystack.in/core#>
SELECT ?cls (COUNT(?s) AS ?n) WHERE {
  ?s a ?cls .
  FILTER(STRSTARTS(STR(?cls), STR(es:)))
} GROUP BY ?cls ORDER BY DESC(?n)`,
  },
];

export default function Sparql() {
  const [q, setQ] = useState(EXAMPLES[0].q);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const r = await api("/ontology/sparql", { method: "POST", body: JSON.stringify({ query: q }) });
      setResult(r);
    } catch (e: any) {
      setErr(e?.message ?? "Query failed");
    } finally {
      setBusy(false);
    }
  }

  const vars: string[] = result?.head?.vars ?? [];
  const bindings: any[] = result?.results?.bindings ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="h1">Query Lab</h1>
        <p className="muted text-sm mt-1">
          Read-only SPARQL against the graph. Mutations are blocked here by design.
        </p>
      </div>

      <div className="card">
        <label className="label">Query</label>
        <textarea
          className="input font-mono text-xs h-56"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          spellCheck={false}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="btn btn-primary" disabled={busy} onClick={run}>
            {busy ? "Running…" : "Run query"}
          </button>
          <span className="muted text-xs">Examples:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.title}
              className="chip cursor-pointer"
              onClick={() => setQ(ex.q)}
              type="button"
            >
              {ex.title}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="card border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40">
          <p className="text-sm text-rose-700 dark:text-rose-300 whitespace-pre-wrap">{err}</p>
        </div>
      )}

      {result && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="h2">{bindings.length} rows</h2>
            <button
              className="btn btn-ghost"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(result, null, 2));
              }}
            >
              Copy JSON
            </button>
          </div>
          {bindings.length === 0 ? (
            <div className="p-6 text-sm muted">No rows returned.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left muted border-b border-slate-200 dark:border-slate-800">
                    {vars.map((v) => (
                      <th key={v} className="py-2 px-3">
                        {v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bindings.map((row, i) => (
                    <tr key={i}>
                      {vars.map((v) => (
                        <td key={v} className="py-2 px-3 font-mono break-all">
                          {row[v]?.value ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
