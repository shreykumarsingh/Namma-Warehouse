import sys
import os

BASE_DIR = r'C:\Users\naman\Downloads\finalfilenw\namma-warehouse-main'
sys.path.insert(0, os.path.join(BASE_DIR, 'backend'))

from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_all():
    print("=== 1. Testing Health & Root ===")
    r = client.get("/")
    assert r.status_code == 200, f"Root failed: {r.text}"
    print("  Root health:", r.json()["status"])

    print("=== 2. Testing City Data ===")
    r = client.get("/api/city")
    assert r.status_code == 200
    city = r.json()
    assert city["total_points"] == 800
    assert city["total_daily_orders"] == 1197150
    print(f"  City points: {city['total_points']}, orders: {city['total_daily_orders']:,}")

    print("=== 3. Testing Normal Optimization & Total Annual Definition (p=3) ===")
    payload = {
        "num_warehouses": 3,
        "petrol_cost_per_km": 2.0,
        "batch_size": 23,
        "min_dispersion_km": 6.5
    }
    r = client.post("/api/optimize", json=payload)
    assert r.status_code == 200
    res = r.json()
    assert res["status"] == "ok"
    assert len(res["warehouses"]) == 3
    assert len(res["assignments"]) == 800
    assert "baseline" in res and res["baseline"] is not None
    base = res["baseline"]
    costs = res["costs"]
    
    # 1. Verify Driver Wages in Total Annual Cost definition
    assert "annual_driver_wages" in costs, "annual_driver_wages must be in costs!"
    assert costs["annual_driver_wages"] > 0, "annual_driver_wages must be > 0"
    expected_total_annual = round(costs["annual_rent"] + costs["annual_fuel"] + costs["annual_driver_wages"], 2)
    assert abs(costs["total_annual"] - expected_total_annual) < 0.05, (
        f"total_annual mismatch: {costs['total_annual']} != {expected_total_annual}"
    )

    # 2. Verify Baseline Definition and Driver Wages in Baseline
    assert "annual_driver_wages" in base, "annual_driver_wages must be in baseline!"
    expected_base_annual = round(base["monthly_rent"] * 12.0 + base["annual_fuel_cost"] + base["annual_driver_wages"], 2)
    assert abs(base["total_annual"] - expected_base_annual) < 0.05, (
        f"baseline total_annual mismatch: {base['total_annual']} != {expected_base_annual}"
    )
    assert base["total_annual"] > costs["total_annual"], "Baseline should have higher transport cost than optimized network!"

    print(f"  Warehouses placed: {[w['id'] + ' (' + w['locality'] + ')' for w in res['warehouses']]}")
    print(f"  Optimized Total Annual: INR {costs['total_annual']:,} (Rent: {costs['annual_rent']:,}, Fuel: {costs['annual_fuel']:,}, Wages: {costs['annual_driver_wages']:,})")
    print(f"  True Baseline Annual: INR {base['total_annual']:,} (Rent: {base['monthly_rent']*12:,}, Fuel: {base['annual_fuel_cost']:,}, Wages: {base['annual_driver_wages']:,})")

    print("=== 4. Testing Determinism across 2 runs ===")
    r2 = client.post("/api/optimize", json=payload)
    res2 = r2.json()
    wh1 = [w["id"] for w in res["warehouses"]]
    wh2 = [w["id"] for w in res2["warehouses"]]
    assert wh1 == wh2, f"Solver is non-deterministic: {wh1} vs {wh2}"
    print(f"  Determinism verified: {wh1} == {wh2}")

    print("=== 5. Testing Scenarios (Demand +40%, Traffic +30%) ===")
    stress_payload = {
        "num_warehouses": 3,
        "demand_multiplier": 1.4,
        "traffic_multiplier": 1.3,
        "petrol_cost_per_km": 3.0,
        "batch_size": 23
    }
    r_stress = client.post("/api/optimize", json=stress_payload)
    assert r_stress.status_code == 200
    stress_res = r_stress.json()
    assert stress_res["costs"]["total_annual"] > res["costs"]["total_annual"], "Stress scenario must increase cost!"
    assert stress_res["costs"]["avg_delivery_time_min"] > res["costs"]["avg_delivery_time_min"], "Traffic scenario must increase delivery time!"
    print(f"  Normal Cost: INR {res['costs']['total_annual']:,} -> Stressed Cost: INR {stress_res['costs']['total_annual']:,}")
    print(f"  Normal Avg Time: {res['costs']['avg_delivery_time_min']} min -> Stressed Avg Time: {stress_res['costs']['avg_delivery_time_min']} min")

    print("=== 6. Testing U-Curve Tradeoff with Wages Definition ===")
    r_trade = client.get("/api/tradeoff?property_size_sqft=2500&petrol_cost_per_km=2.0&batch_size=23&min_dispersion_km=6.5")
    assert r_trade.status_code == 200
    trade = r_trade.json()
    assert "points" in trade and len(trade["points"]) > 0
    assert "recommended_p" in trade and trade["recommended_p"] > 0
    for pt in trade["points"]:
        assert "annual_wages" in pt, "Tradeoff point must include annual_wages"
        expected_pt_total = round(pt["annual_rent"] + pt["annual_fuel"] + pt["annual_wages"], 2)
        assert abs(pt["total_annual"] - expected_pt_total) < 0.05, f"Tradeoff point cost mismatch: {pt}"
    print(f"  Tradeoff curve verified: {len(trade['points'])} points evaluated. Global mathematical minimum p* = {trade['recommended_p']}")

    print("=== 7. Testing Capacity & Radius Feasibility Rejection ===")
    # Total demand is ~1.197M orders/day. 3 warehouses with capacity 5,000 each = 15,000 orders capacity < demand
    cap_payload = {
        "num_warehouses": 3,
        "use_capacity": True,
        "capacity_per_warehouse": 5000.0
    }
    r_cap = client.post("/api/optimize", json=cap_payload)
    assert r_cap.status_code == 200
    cap_res = r_cap.json()
    assert cap_res["status"] == "infeasible", f"Expected infeasible but got: {cap_res['status']}"
    assert cap_res["reason"] == "capacity", f"Expected reason 'capacity' but got: {cap_res.get('reason')}"
    print(f"  Capacity constraint rejection verified: {cap_res['message']}")

    # Radius constraint: 3 warehouses cannot cover the entire city within 2 km
    rad_payload = {
        "num_warehouses": 3,
        "max_radius_km": 2.0
    }
    r_rad = client.post("/api/optimize", json=rad_payload)
    assert r_rad.status_code == 200
    rad_res = r_rad.json()
    assert rad_res["status"] == "infeasible", f"Expected infeasible for 2km radius but got: {rad_res['status']}"
    print(f"  Radius constraint rejection verified: {rad_res['message']}")

    print("=== 8. Testing Custom Points Upload & Exact Same Pipeline Execution ===")
    sample_csv = """point_id,latitude,longitude,orders_per_day,price_per_sqft,traffic_index,name,zone
cp01,12.9716,77.5946,500,8500,0.4,Cubbon Park,Central
cp02,12.9352,77.6245,600,9200,0.6,Koramangala,South
cp03,12.9784,77.6408,450,8900,0.5,Indiranagar,East
cp04,12.9279,77.6271,700,9100,0.5,BTM Layout,South
"""
    r_up = client.post("/api/upload-points", json={"csv_text": sample_csv})
    assert r_up.status_code == 200
    up_res = r_up.json()
    assert up_res["status"] == "ok"
    assert up_res["total_points"] == 4
    assert up_res["total_daily_orders"] == 2250
    print(f"  Uploaded points: {up_res['total_points']}, total daily orders: {up_res['total_daily_orders']}")

    # Pass custom points directly into /api/optimize pipeline
    custom_opt_payload = {
        "num_warehouses": 2,
        "custom_points": up_res["points"]
    }
    r_custom_opt = client.post("/api/optimize", json=custom_opt_payload)
    assert r_custom_opt.status_code == 200
    custom_opt_res = r_custom_opt.json()
    assert custom_opt_res["status"] == "ok"
    assert len(custom_opt_res["warehouses"]) == 2
    assert len(custom_opt_res["assignments"]) == 4
    assert "baseline" in custom_opt_res
    custom_costs = custom_opt_res["costs"]
    expected_c_annual = round(custom_costs["annual_rent"] + custom_costs["annual_fuel"] + custom_costs["annual_driver_wages"], 2)
    assert abs(custom_costs["total_annual"] - expected_c_annual) < 0.05
    print(f"  Custom dataset successfully optimized using exact same GridpointSolver: {len(custom_opt_res['warehouses'])} hubs placed.")

    print("=== ALL 8 INTEGRATION TESTS PASSED WITH 100% SUCCESS! ===")

if __name__ == "__main__":
    test_all()
