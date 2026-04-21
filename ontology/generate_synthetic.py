"""Generate synthetic TTL data: 50 assets, 20 consumers, 30-day readings.

Usage:
    python generate_synthetic.py > synthetic_data.ttl
"""
import random
from datetime import datetime, timedelta

random.seed(42)

PREFIXES = """@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix es:   <https://ontology.energystack.in/core#> .
@prefix data: <https://ontology.energystack.in/data#> .

"""

NOW = datetime(2026, 4, 20, 0, 0, 0)


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def emit_locations(n: int) -> list[str]:
    out = []
    ids = []
    for i in range(n):
        lid = f"data:loc_{i:03d}"
        lat = round(18.9 + random.random() * 9.0, 5)
        lon = round(72.8 + random.random() * 5.5, 5)
        district = random.choice(["MH-Mumbai", "MH-Pune", "RJ-Jaipur", "DL-Delhi", "GJ-Ahmedabad"])
        out.append(
            f"{lid} a es:Location ;\n"
            f'    es:latitude {lat} ;\n'
            f'    es:longitude {lon} ;\n'
            f'    es:adminBoundary "{district}" .\n'
        )
        ids.append(lid)
    return ids, out


def emit_utilities(n: int) -> tuple[list[str], list[str]]:
    names = ["MSEDCL", "BSES Rajdhani", "JVVNL", "TPDDL", "Tata Power"]
    out = []
    ids = []
    for i in range(n):
        uid = f"data:util_{i:02d}"
        out.append(
            f"{uid} a es:Utility ;\n"
            f'    es:entityId "UTIL-{i:02d}" ;\n'
            f'    es:createdAt "{iso(NOW - timedelta(days=3000))}"^^xsd:dateTime .\n'
        )
        ids.append(uid)
    return ids, out


def emit_assets(n: int, utilities: list[str], locs: list[str]) -> tuple[list[str], list[str], list[str]]:
    out = []
    transformer_ids = []
    feeder_ids = []
    # 70% transformers, 25% feeders, 5% substations
    for i in range(n):
        aid = f"data:asset_{i:03d}"
        r = random.random()
        if r < 0.70:
            cls = "es:Transformer"
            transformer_ids.append(aid)
            rating = random.choice([100, 250, 500, 1000])
        elif r < 0.95:
            cls = "es:Feeder"
            feeder_ids.append(aid)
            rating = random.choice([500, 1000, 2000])
        else:
            cls = "es:Substation"
            rating = random.choice([5000, 10000])
        voltage = random.choice(["11kV", "33kV", "66kV", "132kV"])
        install = NOW - timedelta(days=random.randint(365, 365 * 15))
        loc = random.choice(locs)
        out.append(
            f"{aid} a {cls} ;\n"
            f'    es:entityId "IES-ASSET-{i:04d}" ;\n'
            f'    es:assetType "{cls.split(":")[1]}" ;\n'
            f"    es:ratingKva {rating} ;\n"
            f'    es:voltageLevel "{voltage}" ;\n'
            f'    es:installDate "{install.strftime("%Y-%m-%d")}"^^xsd:date ;\n'
            f'    es:cimClassRef "cim:PowerTransformer" ;\n'
            f"    es:hasLocation {loc} .\n"
        )
    return transformer_ids, feeder_ids, out


def emit_consumers(n: int, utilities: list[str], locs: list[str], feeders: list[str]) -> tuple[list[str], list[str]]:
    out = []
    ids = []
    categories = ["domestic", "commercial", "industrial", "agricultural"]
    for i in range(n):
        cid = f"data:cust_{i:03d}"
        cat = random.choice(categories)
        util = random.choice(utilities)
        loc = random.choice(locs)
        out.append(
            f"{cid} a es:Consumer ;\n"
            f'    es:entityId "CONS-{i:04d}" ;\n'
            f'    es:consumerCategory "{cat}" ;\n'
            f"    es:servedBy {util} ;\n"
            f"    es:hasLocation {loc} .\n"
        )
        ids.append(cid)
        # Service connection
        scid = f"data:svc_{i:03d}"
        feeder = random.choice(feeders) if feeders else None
        feeder_line = f"    es:connectedViaFeeder {feeder} ;\n" if feeder else ""
        out.append(
            f"{scid} a es:ServiceConnection ;\n"
            f'    es:meterId "MTR-{i:05d}" ;\n'
            f"    es:consumerOf {cid} ;\n"
            f"{feeder_line}"
            f'    es:createdAt "{iso(NOW - timedelta(days=random.randint(30, 1500)))}"^^xsd:dateTime .\n'
        )
    return ids, out


def emit_readings(feeders: list[str], days: int) -> list[str]:
    out = []
    count = 0
    for f in feeders[:10]:  # limit volume: only first 10 feeders get readings
        for d in range(days):
            # Emit 4 readings per day (every 6 hours) to keep data manageable
            for hour in [0, 6, 12, 18]:
                rid = f"data:read_{count:06d}"
                ts = NOW - timedelta(days=days - d, hours=-hour)
                slot_id = f"data:slot_{count:06d}"
                kwh = round(300 + random.gauss(0, 80), 2)
                pf = round(0.85 + random.random() * 0.1, 3)
                volts = round(230 + random.gauss(0, 5), 2)
                out.append(
                    f"{slot_id} a es:TemporalSlot ;\n"
                    f'    es:startTs "{iso(ts)}"^^xsd:dateTime ;\n'
                    f'    es:endTs "{iso(ts + timedelta(minutes=15))}"^^xsd:dateTime ;\n'
                    f'    es:slotType "15min" .\n'
                )
                out.append(
                    f"{rid} a es:LoadReading ;\n"
                    f"    es:feederRef {f} ;\n"
                    f"    es:kwh {kwh} ;\n"
                    f"    es:powerFactor {pf} ;\n"
                    f"    es:voltage {volts} ;\n"
                    f"    es:atTime {slot_id} .\n"
                )
                count += 1
    return out


def emit_atc_losses(feeders: list[str]) -> list[str]:
    out = []
    for i, f in enumerate(feeders[:15]):
        rid = f"data:atc_{i:03d}"
        billed = round(50000 + random.random() * 20000, 2)
        collected = round(billed * (0.75 + random.random() * 0.2), 2)
        distributed = round(billed * (1.15 + random.random() * 0.15), 2)
        loss = round(((distributed - billed) / distributed) * 100, 2)
        out.append(
            f"{rid} a es:ATCLossRecord ;\n"
            f"    es:feederRef {f} ;\n"
            f"    es:billedKwh {billed} ;\n"
            f"    es:collectedKwh {collected} ;\n"
            f"    es:distributedKwh {distributed} ;\n"
            f"    es:lossPct {loss} .\n"
        )
    return out


def emit_emission_factors() -> list[str]:
    out = []
    ef_specs = [
        ("coal_grid", 0.82, "kgCO2e/kWh", 2024, "CEA"),
        ("solar_pv", 0.04, "kgCO2e/kWh", 2024, "IPCC"),
        ("wind", 0.011, "kgCO2e/kWh", 2024, "IPCC"),
        ("hydro", 0.024, "kgCO2e/kWh", 2024, "IPCC"),
    ]
    for name, val, unit, vintage, source in ef_specs:
        fid = f"data:ef_{name}"
        out.append(
            f"{fid} a es:EmissionFactor ;\n"
            f'    es:entityId "EF-{name.upper()}" ;\n'
            f"    es:efValue {val} ;\n"
            f'    es:efUnit "{unit}" ;\n'
            f"    es:efVintage {vintage} ;\n"
            f'    es:efSource "{source}" .\n'
        )
    return out


def main():
    print(PREFIXES)
    loc_ids, loc_ttl = emit_locations(20)
    util_ids, util_ttl = emit_utilities(3)
    transformer_ids, feeder_ids, asset_ttl = emit_assets(50, util_ids, loc_ids)
    cons_ids, cons_ttl = emit_consumers(20, util_ids, loc_ids, feeder_ids)
    reading_ttl = emit_readings(feeder_ids, 30)
    atc_ttl = emit_atc_losses(feeder_ids)
    ef_ttl = emit_emission_factors()

    for block in [loc_ttl, util_ttl, asset_ttl, cons_ttl, reading_ttl, atc_ttl, ef_ttl]:
        for item in block:
            print(item)


if __name__ == "__main__":
    main()
