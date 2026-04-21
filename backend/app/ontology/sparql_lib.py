"""Canonical pre-baked SPARQL queries (Q1, Q2, Q3 from roadmap + helpers)."""

PREFIX = """
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
PREFIX es:   <https://ontology.energystack.in/core#>
PREFIX data: <https://ontology.energystack.in/data#>
"""


def q_classes() -> str:
    """List all es: classes + label + comment."""
    return PREFIX + """
SELECT ?cls ?label ?comment WHERE {
  ?cls a owl:Class .
  OPTIONAL { ?cls rdfs:label ?label }
  OPTIONAL { ?cls rdfs:comment ?comment }
  FILTER(STRSTARTS(STR(?cls), STR(es:)))
} ORDER BY ?cls
"""


def q_properties() -> str:
    return PREFIX + """
SELECT ?prop ?type ?domain ?range ?label WHERE {
  { ?prop a owl:ObjectProperty . BIND("object" AS ?type) }
  UNION
  { ?prop a owl:DatatypeProperty . BIND("datatype" AS ?type) }
  OPTIONAL { ?prop rdfs:domain ?domain }
  OPTIONAL { ?prop rdfs:range ?range }
  OPTIONAL { ?prop rdfs:label ?label }
  FILTER(STRSTARTS(STR(?prop), STR(es:)))
} ORDER BY ?prop
"""


def q_instances_of(class_uri: str, limit: int = 100, offset: int = 0) -> str:
    return PREFIX + f"""
SELECT ?s ?p ?o WHERE {{
  {{ SELECT DISTINCT ?s WHERE {{ ?s a <{class_uri}> }} LIMIT {limit} OFFSET {offset} }}
  ?s ?p ?o .
}}
"""


def q_count_by_class() -> str:
    return PREFIX + """
SELECT ?cls (COUNT(?s) AS ?n) WHERE {
  ?s a ?cls .
  FILTER(STRSTARTS(STR(?cls), STR(es:)))
} GROUP BY ?cls ORDER BY DESC(?n)
"""


# ---------------------------------------------------------
# Product-layer queries (the roadmap's Q1, Q2, Q3)
# ---------------------------------------------------------


def q1_atc_loss_by_zone() -> str:
    """Q1: AT&C loss % per feeder. Highest-loss feeders on top."""
    return PREFIX + """
SELECT ?feeder ?billed ?distributed ?lossPct WHERE {
  ?rec a es:ATCLossRecord ;
       es:feederRef ?feeder ;
       es:billedKwh ?billed ;
       es:distributedKwh ?distributed ;
       es:lossPct ?lossPct .
} ORDER BY DESC(?lossPct)
"""


def q2_feeder_load_summary() -> str:
    """Q2: Total kWh per feeder over all readings."""
    return PREFIX + """
SELECT ?feeder (SUM(?kwh) AS ?totalKwh) (COUNT(?r) AS ?readings) WHERE {
  ?r a es:LoadReading ;
     es:feederRef ?feeder ;
     es:kwh ?kwh .
} GROUP BY ?feeder ORDER BY DESC(?totalKwh)
"""


def q3_carbon_credit_audit_chain(credit_uri: str) -> str:
    """Q3: Full audit chain for a CarbonCredit: credit → MRV → asset → consumer."""
    return PREFIX + f"""
SELECT ?credit ?mrv ?asset ?assetType ?loc WHERE {{
  BIND(<{credit_uri}> AS ?credit)
  ?credit a es:CarbonCredit ;
          es:verifiedBy ?mrv ;
          es:sourceAsset ?asset .
  ?asset a ?assetType .
  OPTIONAL {{ ?asset es:hasLocation ?loc }}
}}
"""
