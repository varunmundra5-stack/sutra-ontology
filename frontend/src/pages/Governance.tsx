import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface GovHealth {
  valkey_ok: boolean;
  opa_ok: boolean;
  shacl_shapes_loaded: boolean;
}

const SAMPLE_TTL = `@prefix es: <https://ontology.energystack.in/core#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://data.energystack.in/asset/transformer/TR-DEMO>
    a es:Transformer ;
    es:ratingKva "250"^^xsd:double ;
    es:voltageLevel "11kV" .`;

export default function Governance() {
  const [h, setH] = useState<GovHealth | null>(null);
  const [herr, setHerr] = useState<string | null>(null);

  // Policy check
  const [action, setAction] = useState("read");
  const [kind, setKind] = useState("instance");
  const [resId, setResId] = useState("");
  const [policyOut, setPolicyOut] = useState<{ allow: boolean; reason: string } | null>(null);

  // SHACL
  const [ttl, setTtl] = useState(SAMPLE_TTL);
  const [shaclOut, setShaclOut] = useState<{ conforms: boolean; report: string } | null>(null);

  // Consent
  const [subject, setSubject] = useState("https://data.energystack.in/consumer/C-DEMO");
  const [scope, setScope] = useState("operations,analytics");
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10) + "T00:00:00Z"
  );
  const [consentOut, setConsentOut] = useState<string | null>(null);

  useEffect(() => {
    api<GovHealth>("/governance/health")
      .then(setH)
      .catch((e) => setHerr(e.message));
  }, []);

  async function runPolicy() {
    setPolicyOut(null);
    try {
      const r = await api<{ allow: boolean; reason: string }>("/governance/policy/check", {
        method: "POST",
        body: JSON.stringify({ action, resource_kind: kind, resource_id: resId }),
      });
      setPolicyOut(r);
    } catch (e: any) {
      setPolicyOut({ allow: false, reason: e?.message ?? "error" });
    }
  }

  async function runShacl() {
    setShaclOut(null);
    try {
      const r = await api<{ conforms: boolean; report: string }>("/governance/shacl/validate", {
        method: "POST",
        body: JSON.stringify({ turtle: ttl }),
      });
      setShaclOut(r);
    } catch (e: any) {
      setShaclOut({ conforms: false, report: e?.message ?? "error" });
    }
  }

  async function registerConsent() {
    setConsentOut(null);
    try {
      const r = await api<{ ok: boolean; consent_uri: string }>("/governance/consent", {
        method: "POST",
        body: JSON.stringify({
          subject_id: subject,
          granted_by: "self",
          scope: scope.split(",").map((s) => s.trim()).filter(Boolean),
          valid_until: validUntil,
        }),
      });
      setConsentOut(`OK → ${r.consent_uri}`);
    } catch (e: any) {
      setConsentOut(`Error: ${e?.message ?? "failed"}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Governance</h1>
        <p className="muted text-sm mt-1">
          Consent artifacts, OPA policy checks, and SHACL contract validation — the runtime
          guardrails between raw feeds and the graph.
        </p>
      </div>

      {/* Health */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HealthPill label="Valkey (consent cache)" ok={!!h?.valkey_ok} />
        <HealthPill label="OPA (policy engine)" ok={!!h?.opa_ok} />
        <HealthPill label="SHACL shapes" ok={!!h?.shacl_shapes_loaded} />
      </div>
      {herr && <p className="text-xs muted">Health probe: {herr}</p>}

      {/* Policy check */}
      <div className="card space-y-3">
        <div>
          <h2 className="h2">Policy check (OPA)</h2>
          <p className="text-xs muted">
            Evaluates <code>data.sutra.rbac.allow</code> for the signed-in user.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Action</label>
            <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
              <option>read</option>
              <option>write</option>
              <option>mint</option>
              <option>admin</option>
            </select>
          </div>
          <div>
            <label className="label">Resource kind</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option>ontology</option>
              <option>instance</option>
              <option>credit</option>
              <option>governance</option>
              <option>admin</option>
            </select>
          </div>
          <div>
            <label className="label">Resource id (optional)</label>
            <input className="input" value={resId} onChange={(e) => setResId(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={runPolicy}>
          Check
        </button>
        {policyOut && (
          <div
            className={`text-sm p-3 rounded-md ${
              policyOut.allow
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
            }`}
          >
            {policyOut.allow ? "✅ allowed" : `❌ denied — ${policyOut.reason}`}
          </div>
        )}
      </div>

      {/* SHACL validation */}
      <div className="card space-y-3">
        <div>
          <h2 className="h2">SHACL validation</h2>
          <p className="text-xs muted">
            Paste a Turtle snippet. It is validated against{" "}
            <code>ontology/shacl_shapes.ttl</code> by pyshacl.
          </p>
        </div>
        <textarea
          className="input font-mono text-xs h-48"
          value={ttl}
          onChange={(e) => setTtl(e.target.value)}
          spellCheck={false}
        />
        <button className="btn btn-primary" onClick={runShacl}>
          Validate
        </button>
        {shaclOut && (
          <div
            className={`text-sm p-3 rounded-md whitespace-pre-wrap font-mono ${
              shaclOut.conforms
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
            }`}
          >
            {shaclOut.conforms ? "✅ conforms" : shaclOut.report || "violations detected"}
          </div>
        )}
      </div>

      {/* Consent artifact */}
      <div className="card space-y-3">
        <div>
          <h2 className="h2">Register consent artifact</h2>
          <p className="text-xs muted">
            Stores an <code>es:ConsentArtifact</code> in Fuseki and caches it in Valkey for
            ingest-time lookups.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Subject URI (consumer / asset)</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="label">Scope (comma-separated purposes)</label>
            <input className="input" value={scope} onChange={(e) => setScope(e.target.value)} />
          </div>
          <div>
            <label className="label">Valid until (ISO 8601)</label>
            <input
              className="input font-mono text-xs"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={registerConsent}>
          Register
        </button>
        {consentOut && (
          <div className="text-sm p-3 rounded-md bg-slate-50 dark:bg-slate-900 font-mono break-all">
            {consentOut}
          </div>
        )}
      </div>
    </div>
  );
}

function HealthPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`card flex items-center justify-between ${
        ok ? "border-emerald-300 dark:border-emerald-800" : "border-rose-300 dark:border-rose-800"
      }`}
    >
      <span className="text-sm">{label}</span>
      <span
        className={`badge ${
          ok
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
            : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
        }`}
      >
        {ok ? "up" : "down"}
      </span>
    </div>
  );
}
