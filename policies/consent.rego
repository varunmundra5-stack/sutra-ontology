# Sutra OS — Consent / ingestion policy (OPA / Rego)
# Evaluated before raw feeds are mapped into the ontology.
#
# Input shape:
#   {
#     "subject": { "entityId": "...", "kind": "consumer|asset" },
#     "source":  { "id": "...", "type": "SCADA|AMI|GIS|Billing|Govt" },
#     "purpose": "operations|analytics|commercial|research",
#     "consent": { "active": true, "scope": ["..."], "validUntil": "2026-12-31T00:00:00Z" },
#     "now": "2026-04-21T10:00:00Z"
#   }
#
# Output:
#   data.sutra.consent.allow : boolean

package sutra.consent

default allow := false

# Govt/PSU sources are assumed lawful on their own (no per-subject consent needed).
allow if {
    input.source.type == "Govt"
}

# Operational telemetry from grid-side systems (SCADA, GIS) is assumed lawful.
allow if {
    input.source.type == "SCADA"
    input.purpose == "operations"
}

allow if {
    input.source.type == "GIS"
    input.purpose == "operations"
}

# Consumer-linked data (AMI, Billing) REQUIRES active consent covering the purpose.
allow if {
    input.source.type == "AMI"
    consent_valid
    purpose_in_scope
}

allow if {
    input.source.type == "Billing"
    consent_valid
    purpose_in_scope
}

consent_valid if {
    input.consent.active == true
    input.consent.validUntil >= input.now
}

purpose_in_scope if {
    some s in input.consent.scope
    s == input.purpose
}

deny_reason := "consent expired or absent" if {
    not allow
    not consent_valid
} else := "purpose outside consent scope" if {
    not allow
    not purpose_in_scope
} else := "" if allow
