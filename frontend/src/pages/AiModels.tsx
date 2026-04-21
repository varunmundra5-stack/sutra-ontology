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

export default function AiModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ModelInfo | null>(null);
  const [features, setFeatures] = useState({
    load_mw_norm: "0.65",
    power_factor_norm: "0.85",
    line_length_km_norm: "0.45",
    asset_age_norm: "0.30",
  });
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/ai/models")
      .then(r => r.json())
      .then(data => { setModels(data); if (data.length) setSelected(data[0]); })
      .catch(() => setError("Could not load models"))
      .finally(() => setLoading(false));
  }, []);

  const handlePredict = async () => {
    if (!selected) return;
    setPredicting(true);
    setError(null);
    try {
      const featureMap: Record<string, number> = {};
      Object.entries(features).forEach(([k, v]) => { featureMap[k] = parseFloat(v) || 0; });
      const r = await api.post("/ai/predict", {
        model_name: selected.name,
        features: featureMap,
      });
      if (!r.ok) throw new Error(await r.text());
      setResult(await r.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Models</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Plug-in ML models for energy predictions. Supports EBM (Explainable Boosting Machine),
          XGBoost, sklearn, and any compatible model.
        </p>
      </div>

      {loading && <p className="text-gray-500">Loading models…</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* Model list */}
      {!loading && models.length > 0 && (
        <div className="grid gap-3">
          {models.map(m => (
            <button
              key={m.name}
              onClick={() => { setSelected(m); setResult(null); }}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selected?.name === m.name
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">{m.name}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200">
                  {m.model_type}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {m.metadata.description || "—"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Framework: {m.metadata.framework || m.model_type} · Target: {m.metadata.target || "—"}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Inference panel */}
      {selected && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Run Inference — <span className="text-indigo-600">{selected.name}</span>
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(features).map(([k, v]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{k}</label>
                <input
                  type="number"
                  min="0" max="1" step="0.01"
                  value={v}
                  onChange={e => setFeatures(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handlePredict}
            disabled={predicting}
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {predicting ? "Predicting…" : "Predict AT&C Loss %"}
          </button>

          {result && (
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-center">
                <p className="text-xs text-indigo-500 uppercase font-semibold">Predicted AT&C Loss</p>
                <p className="text-4xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">
                  {result.prediction.toFixed(2)}%
                </p>
              </div>

              {result.explanation && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Feature Contributions (EBM)</p>
                  <div className="space-y-1">
                    {Object.entries(result.explanation.feature_contributions)
                      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                      .map(([feat, score]) => (
                        <div key={feat} className="flex items-center gap-2 text-sm">
                          <span className="w-48 truncate text-gray-600 dark:text-gray-300">{feat}</span>
                          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${score >= 0 ? "bg-orange-400" : "bg-blue-400"}`}
                              style={{ width: `${Math.min(100, Math.abs(score) * 10)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-mono w-14 text-right ${score >= 0 ? "text-orange-500" : "text-blue-500"}`}>
                            {score >= 0 ? "+" : ""}{score.toFixed(3)}
                          </span>
                        </div>
                      ))}
                    <div className="flex items-center gap-2 text-sm text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-600">
                      <span className="w-48">intercept</span>
                      <span className="text-xs font-mono">{result.explanation.intercept.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && models.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No models registered yet.</p>
          <p className="text-sm mt-1">Register a fitted sklearn-compatible model via the Python API.</p>
        </div>
      )}
    </div>
  );
}
