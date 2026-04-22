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
    title: "Instance count per class",
    q: `PREFIX es: <https://ontology.energystack.in/core#>
SELECT ?cls (COUNT(?s) AS ?n) WHERE {
  ?s a ?cls .
  FILTER(STRSTARTS(STR(?cls), STR(es:)))
} GROUP BY ?cls ORDER BY DESC(?n)`,
  },
];

export default function Sparql() {
  const [q, setQ]         = useState(EXAMPLES[0].q);
  const [result, setResult] = useState<any>(null);
  const [err, setErr]     = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    setBusy(true); setErr(null); setResult(null);
    try {
      const r = await api<any>("/ontology/sparql", { method: "POST", body: JSON.stringify({ query: q }) });
      setResult(r);
    } catch (e: any) {
      setErr(e?.message ?? "Query failed");
    } finally { setBusy(false); }
  }

  async function copyJson() {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const vars: string[]   = result?.head?.vars ?? [];
  const bindings: any[]  = result?.results?.bindings ?? [];
  const isAsk = result && result.boolean !== undefined;

  return (
    <div className="space-y-6 animate-slide-in">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Query Lab</h1>
          <p className="page-subtitle">Read-only SPARQL against the knowledge graph · mutations are blocked</p>
        </div>
      </div>

      {/* ── Editor ───────────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            SPARQL Query
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Examples:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.title}
                className="chip cursor-pointer hover:border-brand-300 hover:text-brand-600 dark:hover:border-brand-700 dark:hover:text-brand-400 transition-colors text-[11px]"
                onClick={() => { setQ(ex.q); setResult(null); setErr(null); }}
                type="button"
              >
                {ex.title}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            className="textarea h-52 w-full"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            spellCheck={false}
          />
          {/* Line count badge */}
          <div className="absolute bottom-2.5 right-3 text-[10px] text-slate-400 font-mono select-none">
            {q.split("\n").length} lines
          </div>
        </div>

        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={run}
        >
          {busy ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run query
            </>
          )}
        </button>
      </div>

      {err && <div className="alert-error">{err}</div>}

      {/* ── Results ──────────────────────────────────────── */}
      {isAsk && (
        <div className={`card flex items-center gap-3 ${result.boolean ? "border-emerald-200 dark:border-emerald-900/40" : "border-rose-200 dark:border-rose-900/40"}`}>
          <span className={`text-2xl ${result.boolean ? "text-emerald-500" : "text-rose-500"}`}>
            {result.boolean ? "✓" : "✗"}
          </span>
          <div>
            <p className="font-semibold">{result.boolean ? "True" : "False"}</p>
            <p className="text-xs muted">ASK query result</p>
          </div>
        </div>
      )}

      {!isAsk && result && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-sm">Results</h2>
              <span className="badge badge-blue">{bindings.length} rows</span>
              <span className="text-xs muted">{vars.length} columns</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={copyJson}>
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy JSON
                </>
              )}
            </button>
          </div>

          {bindings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <svg className="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No rows returned</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-auto">
                <thead>
                  <tr>
                    {vars.map((v) => (
                      <th key={v} className="th">{v}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bindings.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      {vars.map((v) => (
                        <td key={v} className="td font-mono text-xs break-all max-w-xs">
                          {row[v]?.value ?? (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
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
