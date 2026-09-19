import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from schemas import (
    OptimizeRequest,
    OptimizeResponse,
    CityResponse,
    TradeoffResponse
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

# Enable CORS for all frontends (React, Vite, Next.js, Leaflet)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", summary="Health Check")
def root():
    return {
        "status": "online",
        "service": "GRIDPOINT Discrete Spatial Optimization API",
        "version": "2.0.0",
        "method": "Discrete Capacitated Facility Location with Spatial Dispersion",
        "endpoints": ["/app", "/api/city", "/api/optimize", "/api/tradeoff", "/docs"]
    }

@app.get("/app", summary="Visualization Frontend")
def serve_frontend():
    """Serves the GRIDPOINT interactive map visualization."""
    for cand in [
        os.path.join(BASE_DIR, "frontend", "dist", "index.html"),
        os.path.join(BASE_DIR, "frontend", "index.html"),
        os.path.join(BASE_DIR, "index.html"),
    ]:
        if os.path.exists(cand):
            return FileResponse(cand, media_type="text/html")
    return {"message": "Frontend build not found. Please run 'npm run dev' inside frontend directory."}

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
    - Applies 3-delivery order batching (milk-run routing)
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
        capacity_per_warehouse=req.capacity_per_warehouse
    )
    return result

@app.get("/api/tradeoff", response_model=TradeoffResponse, summary="Fetch U-Curve Cost Trade-off")
def get_tradeoff(
    budget_monthly: Optional[float] = Query(None, description="Monthly rent budget"),
    property_size_sqft: float = Query(2500.0, description="Warehouse size in sq.ft"),
    petrol_cost_per_km: float = Query(2.0, description="Fuel cost rate"),
    batch_size: int = Query(3, description="Deliveries per trip"),
    min_dispersion_km: float = Query(6.5, description="Min separation distance between hubs in km")
):
    """
    Generates the U-curve trade-off data showing how total cost evolves
    as warehouse count p scales from 1 to 5 under spatial dispersion constraints.
    """
    return solver.compute_tradeoff(
        budget_monthly=budget_monthly,
        property_size_sqft=property_size_sqft,
        petrol_cost_per_km=petrol_cost_per_km,
        batch_size=batch_size,
        min_dispersion_km=min_dispersion_km
    )

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
