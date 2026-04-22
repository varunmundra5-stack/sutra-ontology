import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface ModelInfo {
  name: string;
  model_type: string;
  metadata: Record<string, string>;
}

interface PredictResponse {
  model_name: string;
  model_type: string;
  prediction: number;
  explanation: {
    intercept: number;
    feature_contributions: Record<string, number>;
  } | null;
  metadata: Record<string, string>;
}

const FEATURE_LABELS: Record<string, { label: string; hint: string }> = {
  load_mw_norm:        { label: "Load (MW)", hint: "Normalised 0–1 peak demand" },
  power_factor_norm:   { label: "Power Factor", hint: "Normalised 0–1 (1 = unity PF)" },
  line_length_km_norm: { label: "Line Length (km)", hint: "Normalised 0–1 feeder length" },
  asset_age_norm:      { label: "Asset Age", hint: "Normalised 0–1 (1 = oldest)" },
};

export default function AiModels() {
  const [models, setModels]     = useState<ModelInfo[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<ModelInfo | null>(null);
  const [features, setFeatures] = useState({
    load_mw_norm: "0.65",
    power_factor_norm: "0.85",
    line_length_km_norm: "0.45",
    asset_age_norm: "0.30",
  });
  const [result, setResult]     = useState<PredictResponse | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    api<ModelInfo[]>("/ai/models")
      .then((data) => { setModels(data); if (data.length) setSelected(data[0]); })
      .catch(() => setError("Could not load models"))
      .finally(() => setLoading(false));
  }, []);

  async function handlePredict() {
    if (!selected) return;
    setPredicting(true); setError(null);
    try {
      const featureMap: Record<string, number> = {};
      Object.entries(features).forEach(([k, v]) => { featureMap[k] = parseFloat(v) || 0; });
      const r = await api<PredictResponse>("/ai/predict", {
        method: "POST",
        body: JSON.stringify({ model_name: selected.name, features: featureMap }),
      });
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? "Prediction failed");
    } finally { setPredicting(false); }
  }

  const maxContrib = result?.explanation
    ? Math.max(...Object.values(result.explanation.feature_contributions).map(Math.abs), 0.001)
    : 1;

  return (
    <div className="space-y-7 animate-slide-in">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Models</h1>
          <p className="page-subtitle">
            Explainable ML predictions for grid operations · EBM, XGBoost, sklearn
          </p>
        </div>
        {!loading && (
          <span className="chip">{models.length} model{models.length !== 1 ? "s" : ""} registered</span>
        )}
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : models.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m0 0V7m0 0h-2m2 10v2a2 2 0 01-2 2h-2m0 0H9m6 0v-2M9 21H7a2 2 0 01-2-2v-2m0 0V15m0 4h2M3 9v6m18-6v6M9 9h6v6H9z" />
            </svg>
          </div>
          <p className="font-semibold">No models registered yet</p>
          <p className="text-sm muted mt-1">Register a fitted sklearn-compatible model via the Python API.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[280px,1fr] gap-6 items-start">

          {/* ── Model list ───────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Available models
            </p>
            {models.map((m) => {
              const isActive = selected?.name === m.name;
              return (
                <button
                  key={m.name}
                  onClick={() => { setSelected(m); setResult(null); }}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    isActive
                      ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-950/40 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 hover:border-brand-200 dark:hover:border-brand-800 bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{m.name}</span>
                    <span className={`badge shrink-0 ${isActive ? "badge-blue" : "badge-slate"}`}>
                      {m.model_type}
                    </span>
                  </div>
                  <p className="text-xs muted mt-1.5 leading-relaxed">
                    {m.metadata.description || "No description"}
                  </p>
                  <div className="flex gap-3 mt-2">
                    {m.metadata.framework && (
                      <span className="text-[10px] text-slate-400">
                        {m.metadata.framework}
                      </span>
                    )}
                    {m.metadata.target && (
                      <span className="text-[10px] text-slate-400">
                        → {m.metadata.target}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Inference panel ──────────────────────────── */}
          {selected && (
            <div className="space-y-5">
              <div className="card space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="h2">Run inference</h2>
                    <p className="text-xs muted">{selected.name} · {selected.model_type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(features).map(([k, v]) => {
                    const meta = FEATURE_LABELS[k] ?? { label: k, hint: "" };
                    return (
                      <div key={k} className="input-group">
                        <label className="label">
                          {meta.label}
                          {meta.hint && (
                            <span className="ml-1.5 text-slate-400 font-normal">· {meta.hint}</span>
                          )}
                        </label>
                        <div className="relative">
                          <input
                            type="number" min="0" max="1" step="0.01"
                            value={v}
                            onChange={(e) => setFeatures((f) => ({ ...f, [k]: e.target.value }))}
                            className="input pr-12 tabular-nums"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div
                              className="w-8 h-1.5 rounded-full bg-brand-100 dark:bg-brand-900 overflow-hidden"
                            >
                              <div
                                className="h-full bg-brand-500 rounded-full"
                                style={{ width: `${Math.min(100, (parseFloat(v) || 0) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handlePredict}
                  disabled={predicting}
                  className="btn btn-primary w-full"
                >
                  {predicting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Computing prediction…
                    </>
                  ) : (
                    "Predict AT&C Loss %"
                  )}
                </button>
              </div>

              {/* ── Result ──────────────────────────────── */}
              {result && (
                <div className="card space-y-5">
                  {/* Big prediction number */}
                  <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-center text-white">
                    <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-2">
                      Predicted AT&C Loss
                    </p>
                    <p className="text-5xl font-bold tabular-nums tracking-tight">
                      {result.prediction.toFixed(2)}
                      <span className="text-3xl ml-1 opacity-80">%</span>
                    </p>
                    <p className="text-xs opacity-60 mt-2">
                      via {result.model_type} · {result.model_name}
                    </p>
                  </div>

                  {/* Feature contributions */}
                  {result.explanation && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                        Feature contributions (EBM explanation)
                      </p>
                      <div className="space-y-2.5">
                        {Object.entries(result.explanation.feature_contributions)
                          .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                          .map(([feat, score]) => {
                            const pct = (Math.abs(score) / maxContrib) * 100;
                            const isPos = score >= 0;
                            const label = FEATURE_LABELS[feat]?.label ?? feat;
                            return (
                              <div key={feat} className="grid grid-cols-[1fr,auto] gap-2 items-center">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium">{label}</span>
                                    <span className={`text-xs font-mono font-semibold ${
                                      isPos ? "text-rose-600 dark:text-rose-400" : "text-brand-600 dark:text-brand-400"
                                    }`}>
                                      {isPos ? "+" : ""}{score.toFixed(3)}
                                    </span>
                                  </div>
                                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${isPos ? "bg-rose-500" : "bg-brand-500"}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-xs text-slate-400">Intercept (base rate)</span>
                          <span className="text-xs font-mono text-slate-500">
                            {result.explanation.intercept.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
