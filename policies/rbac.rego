# Sutra OS — Authorization policy (OPA / Rego)
# Evaluated by the FastAPI backend via POST /v1/data/sutra/rbac/allow.
#
# Input shape:
#   {
#     "user":   { "email": "...", "role": "admin|editor|viewer" },
#     "action": "read | write | mint | admin",
#     "resource": { "kind": "ontology|instance|credit|governance|admin", "id": "..." }
#   }
#
# Output:
#   data.sutra.rbac.allow : boolean

package sutra.rbac

default allow := false

# Admins can do anything.
allow if {
    input.user.role == "admin"
}

# Editors can read everything + write instances + mint credits.
allow if {
    input.user.role == "editor"
    input.action == "read"
}

allow if {
    input.user.role == "editor"
    input.action == "write"
    input.resource.kind != "admin"
}

allow if {
    input.user.role == "editor"
    input.action == "mint"
    input.resource.kind == "credit"
}

# Viewers are read-only and cannot see governance/admin resources.
allow if {
    input.user.role == "viewer"
    input.action == "read"
    input.resource.kind != "admin"
    input.resource.kind != "governance"
}

# Helpful companion: explain *why* a request was denied (for UI toasts).
deny_reason := reason if {
    not allow
    reason := sprintf(
        "role=%s not permitted to %s on %s",
        [input.user.role, input.action, input.resource.kind],
    )
} else := ""
