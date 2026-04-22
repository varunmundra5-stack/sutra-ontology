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

  const [action, setAction] = useState("read");
  const [kind, setKind]     = useState("instance");
  const [resId, setResId]   = useState("");
  const [policyOut, setPolicyOut] = useState<{ allow: boolean; reason: string } | null>(null);
  const [policyBusy, setPolicyBusy] = useState(false);

  const [ttl, setTtl]             = useState(SAMPLE_TTL);
  const [shaclOut, setShaclOut]   = useState<{ conforms: boolean; report: string } | null>(null);
  const [shaclBusy, setShaclBusy] = useState(false);

  const [subject, setSubject]         = useState("https://data.energystack.in/consumer/C-DEMO");
  const [scope, setScope]             = useState("operations,analytics");
  const [validUntil, setValidUntil]   = useState(
    new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10) + "T00:00:00Z"
  );
  const [consentOut, setConsentOut]   = useState<string | null>(null);
  const [consentBusy, setConsentBusy] = useState(false);

  useEffect(() => {
    api<GovHealth>("/governance/health").then(setH).catch((e) => setHerr(e.message));
  }, []);

  async function runPolicy() {
    setPolicyBusy(true); setPolicyOut(null);
    try {
      const r = await api<{ allow: boolean; reason: string }>("/governance/policy/check", {
        method: "POST",
        body: JSON.stringify({ action, resource_kind: kind, resource_id: resId }),
      });
      setPolicyOut(r);
    } catch (e: any) {
      setPolicyOut({ allow: false, reason: e?.message ?? "error" });
    } finally { setPolicyBusy(false); }
  }

  async function runShacl() {
    setShaclBusy(true); setShaclOut(null);
    try {
      const r = await api<{ conforms: boolean; report: string }>("/governance/shacl/validate", {
        method: "POST",
        body: JSON.stringify({ turtle: ttl }),
      });
      setShaclOut(r);
    } catch (e: any) {
      setShaclOut({ conforms: false, report: e?.message ?? "error" });
    } finally { setShaclBusy(false); }
  }

  async function registerConsent() {
    setConsentBusy(true); setConsentOut(null);
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
      setConsentOut(`✓ ${r.consent_uri}`);
    } catch (e: any) {
      setConsentOut(`Error: ${e?.message ?? "failed"}`);
    } finally { setConsentBusy(false); }
  }

  return (
    <div className="space-y-7 animate-slide-in">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance</h1>
          <p className="page-subtitle">
            Consent artifacts, OPA policy decisions, and SHACL validation — runtime guardrails for the graph
          </p>
        </div>
      </div>

      {/* ── System health ────────────────────────────────── */}
      <div>
        <h2 className="h3 mb-3 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-widest font-semibold">
          System Status
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ServiceCard
            name="Valkey"
            desc="Consent cache (Redis fork)"
            ok={h?.valkey_ok ?? null}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            }
          />
          <ServiceCard
            name="OPA"
            desc="Open Policy Agent · RBAC"
            ok={h?.opa_ok ?? null}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <ServiceCard
            name="SHACL Engine"
            desc="Shape constraint validation"
            ok={h?.shacl_shapes_loaded ?? null}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />
        </div>
        {herr && <p className="text-xs text-slate-400 mt-2">Health probe error: {herr}</p>}
      </div>

      {/* ── Policy check ─────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h2 className="h2">Policy check (OPA)</h2>
            <p className="text-xs muted mt-0.5">
              Evaluates <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">data.sutra.rbac.allow</code> for the signed-in user
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="input-group">
            <label className="label">Action</label>
            <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
              {["read", "write", "mint", "admin"].map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="label">Resource kind</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              {["ontology", "instance", "credit", "governance", "admin"].map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="label">Resource ID <span className="text-slate-400">(optional)</span></label>
            <input className="input" value={resId} onChange={(e) => setResId(e.target.value)} placeholder="e.g. feeder/F001" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-primary" onClick={runPolicy} disabled={policyBusy}>
            {policyBusy ? <Spinner /> : null} Evaluate policy
          </button>
          {policyOut && (
            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ${
              policyOut.allow
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
            }`}>
              <span>{policyOut.allow ? "✓" : "✗"}</span>
              <span>{policyOut.allow ? "Allowed" : `Denied — ${policyOut.reason}`}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── SHACL Validation ─────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div>
            <h2 className="h2">SHACL validation</h2>
            <p className="text-xs muted mt-0.5">
              Validate a Turtle snippet against <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">shacl_shapes.ttl</code> via pyshacl
            </p>
          </div>
        </div>

        <textarea
          className="textarea h-44 w-full"
          value={ttl}
          onChange={(e) => setTtl(e.target.value)}
          spellCheck={false}
        />

        <div className="flex items-center gap-3">
          <button className="btn btn-primary" onClick={runShacl} disabled={shaclBusy}>
            {shaclBusy ? <Spinner /> : null} Validate
          </button>
          {shaclOut && (
            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ${
              shaclOut.conforms
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
            }`}>
              <span>{shaclOut.conforms ? "✓ Conforms" : "✗ Violations detected"}</span>
            </div>
          )}
        </div>

        {shaclOut && !shaclOut.conforms && shaclOut.report && (
          <pre className="code-block text-xs whitespace-pre-wrap">{shaclOut.report}</pre>
        )}
      </div>

      {/* ── Consent artifact ─────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <h2 className="h2">Register consent artifact</h2>
            <p className="text-xs muted mt-0.5">
              Stores an <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">es:ConsentArtifact</code> in Fuseki and caches it in Valkey
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 input-group">
            <label className="label">Subject URI</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="label">Scope <span className="text-slate-400 text-xs">(comma-separated)</span></label>
            <input className="input" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="operations,analytics" />
          </div>
          <div className="input-group">
            <label className="label">Valid until</label>
            <input className="input font-mono text-xs" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary" onClick={registerConsent} disabled={consentBusy}>
          {consentBusy ? <Spinner /> : null} Register consent
        </button>

        {consentOut && (
          <div className={`text-sm p-3 rounded-lg font-mono break-all ${
            consentOut.startsWith("✓")
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
          }`}>
            {consentOut}
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceCard({
  name, desc, ok, icon,
}: {
  name: string; desc: string; ok: boolean | null;
  icon: React.ReactNode;
}) {
  const statusColor = ok === null ? "text-slate-400" : ok ? "text-emerald-500" : "text-rose-500";
  const borderColor = ok === null
    ? "border-slate-200 dark:border-slate-800"
    : ok
    ? "border-emerald-200 dark:border-emerald-900/40"
    : "border-rose-200 dark:border-rose-900/40";
  const bgColor = ok === null
    ? ""
    : ok
    ? "bg-emerald-50/50 dark:bg-emerald-950/20"
    : "bg-rose-50/50 dark:bg-rose-950/20";

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${borderColor} ${bgColor}`}>
      <div className={`${statusColor} opacity-80`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs muted truncate">{desc}</div>
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        {ok === null ? (
          <span className="status-dot bg-slate-300" />
        ) : ok ? (
          <>
            <span className="status-dot status-dot-green status-dot-pulse" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Up</span>
          </>
        ) : (
          <>
            <span className="status-dot status-dot-red" />
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Down</span>
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
