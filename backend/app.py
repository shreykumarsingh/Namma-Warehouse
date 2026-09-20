import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any

from fastapi.staticfiles import StaticFiles

from schemas import (
    OptimizeRequest,
    OptimizeResponse,
    CityResponse,
    TradeoffResponse,
    UploadPointsRequest,
    UploadPointsResponse,
    CityDataPoint
)
from solver import GridpointSolver

# Determine data paths relative to project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
candidate_paths = [
    os.path.join(BASE_DIR, "City data", "bangalore_data_normalized.csv"),
    os.path.join(BASE_DIR, "City data", "bangalore_data_normalize.csv"),
    os.path.join(BASE_DIR, "City data", "bangalore_data.csv"),
]
DATA_PATH = next((p for p in candidate_paths if os.path.exists(p)), candidate_paths[0])
LOCALITY_PATH = os.path.join(BASE_DIR, "City data", "prices", "bangalore_locality_prices.csv")

# Eager startup initialization
print("[GRIDPOINT] Loading Discrete Spatial Solver...")
print(f"  Dataset: {DATA_PATH}")
print(f"  Localities: {LOCALITY_PATH}")
solver = GridpointSolver(DATA_PATH, LOCALITY_PATH)
print(f"[GRIDPOINT] Ready! 800 discrete candidate nodes loaded ({solver.total_orders:,.0f} orders/day).")

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

# Initialize FastAPI application
app = FastAPI(
    title="GRIDPOINT — Bangalore Warehouse Spatial Optimization API",
    description="Discrete Capacitated Facility Location Solver with Spatial Dispersion Constraints",
    version="2.0.0",
    lifespan=lifespan
)

import io
import csv

# Enable CORS for local dev & production environments (including Render)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount React 19 Frontend Dashboard if compiled
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/dashboard", StaticFiles(directory=FRONTEND_DIST, html=True), name="dashboard")

@app.get("/", summary="Health Check")
def root():
    return {
        "status": "online",
        "service": "GRIDPOINT Discrete Spatial Optimization API",
        "version": "2.0.0",
        "method": "Discrete Capacitated Facility Location with Spatial Dispersion",
        "endpoints": ["/dashboard", "/app", "/api/city", "/api/optimize", "/api/tradeoff", "/api/upload-points", "/docs"]
    }

@app.get("/app", summary="Visualization Frontend")
def serve_frontend():
    """Serves the frontend dashboard."""
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_path):
        return FileResponse(
            index_path,
            media_type="text/html",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    return {"status": "ok", "message": "Frontend running via Vite at http://localhost:3000 or run 'npm run build' in frontend/"}

@app.get("/api/city", response_model=CityResponse, summary="Fetch City Grid & Metadata")
def get_city():
    """
    Returns Bangalore spatial bounds, all 800 grid nodes with normalized metrics,
    and default simulation settings.
    """
    return solver.get_city_summary()

@app.post("/api/optimize", response_model=OptimizeResponse, summary="Run Warehouse Location Optimization")
def optimize_network(req: OptimizeRequest):
    """
    Runs the discrete facility location optimizer:
    - Finds p optimal warehouse locations minimizing total operational cost (rent + batched fuel)
    - Enforces Spatial Dispersion (D_min) to guarantee warehouses never clump nearby
    - Employs Regret-First assignment to prevent capacity deadlocks and stranded nodes
    - Transmits demand multipliers, traffic multipliers, and warehouse outages for real scenarios
    - Computes real baseline comparison against single centralized facility
    """
    result = solver.solve(
        num_warehouses=req.num_warehouses,
        budget_monthly=req.budget_monthly,
        property_size_sqft=req.property_size_sqft,
        petrol_cost_per_km=req.petrol_cost_per_km,
        batch_size=req.batch_size,
        min_dispersion_km=req.min_dispersion_km,
        max_radius_km=req.max_radius_km,
        use_capacity=req.use_capacity,
        capacity_per_warehouse=req.capacity_per_warehouse,
        ev_fleet_pct=req.ev_fleet_pct,
        picking_time_min=req.picking_time_min,
        target_sla_minutes=req.target_sla_minutes,
        demand_multiplier=req.demand_multiplier,
        traffic_multiplier=req.traffic_multiplier,
        disabled_warehouse_ids=req.disabled_warehouse_ids,
        custom_points=req.custom_points
    )
    return result

@app.get("/api/tradeoff", response_model=TradeoffResponse, summary="Fetch U-Curve Cost Trade-off")
def get_tradeoff(
    budget_monthly: Optional[float] = Query(None, description="Monthly rent budget"),
    property_size_sqft: float = Query(2500.0, description="Warehouse size in sq.ft"),
    petrol_cost_per_km: float = Query(2.0, description="Fuel cost rate"),
    batch_size: int = Query(23, description="Deliveries per driver per day (default: 23)"),
    min_dispersion_km: float = Query(6.5, description="Min separation distance between hubs in km"),
    target_p: Optional[int] = Query(None, description="Current chosen warehouse count to highlight"),
    ev_fleet_pct: float = Query(0.0, description="EV fleet percentage"),
    demand_multiplier: float = Query(1.0, description="Demand multiplier"),
    traffic_multiplier: float = Query(1.0, description="Traffic multiplier")
):
    """
    Generates the true U-curve trade-off data showing how total operational cost evolves
    across candidate warehouse counts under spatial dispersion and EV green fleet constraints.
    """
    return solver.compute_tradeoff(
        budget_monthly=budget_monthly,
        property_size_sqft=property_size_sqft,
        petrol_cost_per_km=petrol_cost_per_km,
        batch_size=batch_size,
        min_dispersion_km=min_dispersion_km,
        target_p=target_p,
        ev_fleet_pct=ev_fleet_pct,
        demand_multiplier=demand_multiplier,
        traffic_multiplier=traffic_multiplier
    )

@app.post("/api/upload-points", response_model=UploadPointsResponse, summary="Upload Custom Neighborhood CSV Dataset")
async def upload_custom_points(request: Request):
    """
    Accepts custom neighborhood points either as JSON (with 'csv_text' or 'points') or raw CSV payload.
    Validates and indexes points for visualization and optimization.
    """
    body_json = None
    csv_text = None
    points_input = None

    try:
        body_json = await request.json()
        if isinstance(body_json, dict):
            csv_text = body_json.get("csv_text")
            points_input = body_json.get("points")
        elif isinstance(body_json, list):
            points_input = body_json
    except Exception:
        raw_bytes = await request.body()
        if raw_bytes:
            csv_text = raw_bytes.decode("utf-8-sig", errors="replace")

    parsed_points = []

    if points_input and isinstance(points_input, list):
        for i, row in enumerate(points_input):
            try:
                lat = float(row.get('latitude') or row.get('lat') or 12.97)
                lng = float(row.get('longitude') or row.get('lng') or 77.59)
                orders = float(row.get('orders_per_day') or row.get('orders') or row.get('daily_orders') or 100.0)
                price = float(row.get('price_per_sqft') or row.get('price') or row.get('sqft_price') or 8500.0)
                traffic = float(row.get('traffic_index') or row.get('traffic') or 0.5)
                name = str(row.get('name') or row.get('locality') or row.get('neighborhood') or row.get('nearest_locality') or f"Node {i+1}")
                pid = str(row.get('point_id') or row.get('id') or f"c{i+1:03d}")
                zone = str(row.get('zone') or 'Custom')

                parsed_points.append(CityDataPoint(
                    point_id=pid,
                    latitude=lat,
                    longitude=lng,
                    orders_per_day=orders,
                    price_per_sqft=price,
                    traffic_index=min(1.0, max(0.05, traffic)),
                    norm_demand=float(row.get('norm_demand') or 0.5),
                    norm_price=float(row.get('norm_price') or 0.5),
                    norm_traffic=min(1.0, max(0.05, traffic)),
                    suitability_score=float(row.get('suitability_score') or 0.5),
                    nearest_locality=name,
                    zone=zone
                ))
            except Exception:
                continue

    elif csv_text:
        reader = csv.DictReader(io.StringIO(csv_text))
        for i, row in enumerate(reader):
            try:
                lat = float(row.get('latitude') or row.get('lat') or 12.97)
                lng = float(row.get('longitude') or row.get('lng') or 77.59)
                orders = float(row.get('orders_per_day') or row.get('orders') or row.get('daily_orders') or 100.0)
                price = float(row.get('price_per_sqft') or row.get('price') or row.get('sqft_price') or 8500.0)
                traffic = float(row.get('traffic_index') or row.get('traffic') or 0.5)
                name = str(row.get('name') or row.get('locality') or row.get('neighborhood') or f"Node {i+1}")
                pid = str(row.get('point_id') or row.get('id') or f"c{i+1:03d}")
                zone = str(row.get('zone') or 'Custom')

                parsed_points.append(CityDataPoint(
                    point_id=pid,
                    latitude=lat,
                    longitude=lng,
                    orders_per_day=orders,
                    price_per_sqft=price,
                    traffic_index=min(1.0, max(0.05, traffic)),
                    norm_demand=0.5,
                    norm_price=0.5,
                    norm_traffic=min(1.0, max(0.05, traffic)),
                    suitability_score=0.5,
                    nearest_locality=name,
                    zone=zone
                ))
            except Exception:
                continue

    if not parsed_points:
        return UploadPointsResponse(
            status="error",
            message="No valid coordinate rows found in uploaded data.",
            total_points=0,
            total_daily_orders=0.0,
            points=[]
        )

    return UploadPointsResponse(
        status="ok",
        message=f"Successfully loaded {len(parsed_points)} points.",
        total_points=len(parsed_points),
        total_daily_orders=sum(p.orders_per_day for p in parsed_points),
        points=parsed_points
    )

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True, app_dir=os.path.dirname(os.path.abspath(__file__)))
