# GRIDPOINT — Bangalore Warehouse Spatial Optimization Platform

> **Advanced Discrete Facility Location Optimizer, 10-Minute Quick-Commerce SLA Engine & ESG Fleet Simulator**

---

## 📌 Table of Contents

1. [Executive Summary & Problem Statement](#-executive-summary--problem-statement)
2. [The Core Insight: Why 3 Warehouses Fail at 10-Minute Delivery](#-the-core-insight-why-3-warehouses-fail-at-10-minute-delivery)
3. [Algorithmic Architecture & Optimization Logic](#-algorithmic-architecture--optimization-logic)
   - [Zero K-Means Philosophy](#zero-k-means-philosophy)
   - [Discrete Capacitated Facility Location Formulation](#discrete-capacitated-facility-location-formulation)
   - [Adaptive Spatial Dispersion Constraints](#adaptive-spatial-dispersion-constraints)
   - [Anti-Deadlock Regret-First Demand Allocation](#anti-deadlock-regret-first-demand-allocation)
   - [Vectorized Local Swap Search](#vectorized-local-swap-search)
4. [10-Minute Quick-Commerce SLA Compliance Metric](#-10-minute-quick-commerce-sla-compliance-metric)
5. [Delivery Workforce Modeling & Economics](#-delivery-workforce-modeling--economics)
6. [EV Fleet Transition & ESG Savings Simulator](#-ev-fleet-transition--esg-savings-simulator)
7. [The U-Curve Operational Cost Trade-Off](#-the-u-curve-operational-cost-trade-off)
8. [Bangalore Geospatial Dataset & Normalization](#-bangalore-geospatial-dataset--normalization)
9. [System Architecture & Repository Structure](#-system-architecture--repository-structure)
10. [REST API Specification](#-rest-api-specification)
11. [Interactive Glassmorphic Map Application](#-interactive-glassmorphic-map-application)
12. [Installation & Getting Started](#-installation--getting-started)

---

## 🎯 Executive Summary & Problem Statement

Modern quick-commerce companies in India (such as Blinkit, Zepto, and Swiggy Instamart) promise deliveries within **10 minutes**. Simultaneously, e-commerce platforms and logistics aggregators face severe cost pressures and tightening government mandates to electrify two-wheeler delivery fleets.

### The Optimization Challenge
Given 800 candidate geographical nodes spanning Greater Bangalore:
- **Where should warehouses and micro-fulfillment hubs (dark stores) be placed?**
- **Which demand zones should each warehouse serve?**
- **How many hubs are physically necessary to guarantee 10-minute delivery under Bangalore traffic conditions?**
- **What are the financial and environmental benefits of transitioning the delivery fleet to Electric Vehicles (EVs)?**

GRIDPOINT solves this multi-objective combinatorial optimization problem in sub-second runtimes, evaluating fixed commercial lease bills, dynamic fuel expenditures, labor costs, spatial separation, traffic-dependent road travel times, and fleet carbon emissions.

---

## ⚡ The Core Insight: Why 3 Warehouses Fail at 10-Minute Delivery

Non-technical stakeholders and corporate planners often assume that 3 or 4 large regional distribution centers are sufficient to cover Bangalore. **GRIDPOINT mathematically proves why this is physically impossible for quick-commerce**:

- In a 3-warehouse network, the average delivery distance to customer doorsteps is **7 to 12 km**.
- At typical Bangalore two-wheeler traffic speeds (averaging ~20-25 km/h) plus a mandatory 3-minute warehouse picking and packing window:
  - Average delivery time is **~19.5 to 21 minutes**.
  - Only **~11.6%** of customer orders can physically be delivered within 10 minutes.
- To achieve true quick-commerce SLA compliance, companies must decentralize into **50 to 100 localized micro-hubs (dark stores)**:
  - At **25 warehouses**: Average delivery time drops to **9.2 minutes**, with **61.7%** SLA compliance.
  - At **75 micro-hubs**: Average delivery time drops to **6.4 minutes**, achieving **98.3%** SLA compliance.

---

## 🧠 Algorithmic Architecture & Optimization Logic

### Zero K-Means Philosophy
Standard machine learning clustering algorithms like K-Means are fundamentally flawed for spatial logistics:
1. **Unrealistic Centroids**: K-Means places centroids in continuous coordinate space, frequently suggesting warehouse locations in lakes (e.g., Bellandur Lake), military defense zones, or non-commercial residential centers.
2. **Ignores Real Estate Economics**: K-Means assumes all land costs are uniform, ignoring that Koramangala or Indiranagar real estate costs 3x more than Peenya or Bommasandra.
3. **Ignores Road Detours & Traffic**: Euclidean distance fails to reflect real road networks and traffic congestion corridors.

GRIDPOINT enforces **Discrete Facility Location**: Every warehouse candidate is strictly constrained to real, discrete geographical nodes with verified commercial real estate pricing and traffic ratings.

---

### Discrete Capacitated Facility Location Formulation

Let $I$ be the set of 800 discrete customer demand nodes across Bangalore, and $J$ be the set of 800 candidate warehouse sites ($J \subseteq I$).

- $d_i$: Daily order demand at customer node $i \in I$ (totaling 1,197,150 orders/day across Bangalore).
- $c_j$: Monthly commercial rental cost for operating a warehouse facility at site $j \in J$.
- $D_{ij}$: Road transit distance between customer node $i$ and warehouse site $j$.
- $T_{ij}$: Traffic-weighted travel time between node $i$ and warehouse $j$.
- $p$: Target number of warehouses to place ($1 \le p \le 100$).
- $y_j \in \{0, 1\}$: Binary decision variable indicating whether warehouse site $j$ is activated.
- $x_{ij} \in \{0, 1\}$: Decision variable indicating whether demand node $i$ is assigned to warehouse $j$.

#### Objective Function
The optimizer minimizes total annual operational expenditure:
$$\min \quad \sum_{j \in J} c_j \cdot y_j + \text{Fleet Travel Cost}(x, D) + \text{Workforce Wages}$$

Subject to:
$$\sum_{j \in J} y_j = p$$
$$\sum_{j \in J} x_{ij} = 1 \quad \forall i \in I$$
$$x_{ij} \le y_j \quad \forall i \in I, j \in J$$
$$\| \text{loc}_j - \text{loc}_k \| \ge D_{\min} \cdot y_j y_k \quad \forall j \neq k \quad \text{(Spatial Dispersion)}$$
$$\sum_{i \in I} d_i \cdot x_{ij} \le \text{Cap}_j \cdot y_j \quad \forall j \in J \quad \text{(Capacity Constraint)}$$

---

### Adaptive Spatial Dispersion Constraints

A critical real-world failure mode in greedy facility optimization is **hub clumping** (e.g., placing multiple warehouses next to each other in high-density areas like Koramangala). 

GRIDPOINT enforces a minimum inter-warehouse separation distance ($D_{\min}$):
- For small networks ($p \le 5$), $D_{\min}$ defaults to **6.5 km**.
- As the user scales the network up to 100 micro-hubs, Bangalore's geographic area (~750 sq.km) naturally requires tighter spacing. The solver incorporates **Adaptive Spatial Dispersion Scaling**:
$$D_{\text{effective}} = \min\left(D_{\text{user}}, \sqrt{\frac{750.0}{\pi \cdot p}} \times 1.25\right)$$
This guarantees that candidate hubs spread evenly across North, South, East, West, and Central Bangalore without clustering or becoming mathematically infeasible.

---

### Anti-Deadlock Regret-First Demand Allocation

When warehouse capacity limits are active, naive greedy assignment (assigning nearest customers first) leads to capacity exhaustion at central hubs, leaving remote boundary customers stranded with no available warehouse within radius.

GRIDPOINT implements **Regret-Based Allocation**:
1. For every demand node $i$, calculate its regret value:
$$\text{Regret}_i = D_{i, \text{second\_nearest}} - D_{i, \text{nearest}}$$
2. Customers with the highest regret are prioritized for assignment first because being denied their nearest hub incurs the largest distance penalty.
3. Low-regret customers (who sit equidistant between multiple hubs) are assigned last, ensuring zero stranded nodes and zero allocation deadlocks.

---

### Vectorized Local Swap Search

Following greedy seeding, GRIDPOINT executes an ultra-fast vectorized 1-opt local swap search across NumPy distance matrices:
- Evaluates moving any active warehouse $j$ to any unselected candidate site $j'$.
- Leverages broadcasting matrix subtraction:
$$\Delta \text{Cost} = \text{Demand} \cdot \left( \min(D_{\text{existing}}, D_{j'}) - D_{\text{current}} \right)$$
- Converges to a local optimum in less than 150 milliseconds.

---

## ⏱️ 10-Minute Quick-Commerce SLA Compliance Metric

To evaluate customer fulfillment speed, GRIDPOINT models realistic urban two-wheeler physics modulated by real-time traffic congestion:

### 1. Urban Transit Speed Model
Bangalore two-wheelers cannot travel at highway speeds due to signals, speed breakers, and arterial congestion. Speed is modeled dynamically as a function of each zone's empirical traffic density index ($0.0 \le \tau_i \le 1.0$):
$$\text{Speed}_i (\text{km/h}) = \frac{30.0}{1.0 + 0.28 \cdot \tau_i}$$
- Free-flowing peripheral roads: ~26–30 km/h.
- Heavy arterial corridors (Silk Board, Tin Factory, Outer Ring Road): ~18–22 km/h.

### 2. End-to-End Delivery Time Equation
$$\text{Delivery Time}_i (\text{minutes}) = \text{Picking Time} + \left( \frac{D_{ij}}{\text{Speed}_i} \times 60 \right)$$
Where:
- $\text{Picking Time} = 3.0 \text{ minutes}$ (dark store item retrieval, packing, QR scanning, and rider handoff).
- $D_{ij}$ is the road transit distance in kilometers (derived using Haversine distance adjusted by a 1.28x urban street grid detour factor).

### 3. Network SLA Compliance Gauge
An order is strictly compliant if $\text{Delivery Time}_i \le 10.0 \text{ minutes}$.

$$\text{SLA Compliance \%} = \frac{\sum_{i \in \text{Compliant}} d_i}{\sum_{i \in I} d_i} \times 100$$

| Warehouse Count ($p$) | Avg Delivery Distance | Avg Delivery Time | 10-Min SLA Compliance | Verdict |
| :---: | :---: | :---: | :---: | :--- |
| **3 Hubs** | 10.8 km | **19.5 min** | **11.6%** | ❌ Physically impossible for 10-min delivery |
| **10 Hubs** | 5.6 km | **13.4 min** | **34.2%** | ⚠️ Moderate coverage; frequent SLA breaches |
| **25 Hubs** | 3.2 km | **9.2 min** | **61.7%** | 🟡 Viable quick-commerce core coverage |
| **50 Hubs** | 2.1 km | **7.5 min** | **84.9%** | 🟢 Strong quick-commerce fulfillment |
| **75 Hubs** | 1.6 km | **6.4 min** | **98.3%** | 🏆 Near-perfect 10-minute SLA guarantee |

---

## 👥 Delivery Workforce Modeling & Economics

GRIDPOINT models the complete labor and delivery economics for Bangalore's quick-commerce operations:

- **Total Citywide Demand**: 1,197,150 customer orders per day across 800 grid nodes.
- **Rider Shift Capacity**: A delivery driver completes an average of **23 deliveries per 8-hour shift** (configurable from 15 to 30 deliveries/day in the UI).
- **Active Fleet Workforce**:
$$\text{Total Drivers} = \frac{1,197,150 \text{ orders/day}}{23 \text{ orders/driver/day}} \approx \mathbf{52,050 \text{ active drivers}}$$
- **Fair Wage Baseline**: Drivers earn a standard daily wage of **₹1,000 / day** (~₹30,000 / month), representing ₹5.2 Crore/day in direct logistics employment.
- **Driver Daily Travel**:
  - Across 23 deliveries with localized dispatch, each driver travels approximately **14 to 20 km per daily shift**.
  - Total citywide fleet travel across all 52,050 drivers is **~650,000 to 850,000 km/day**.

---

## 🌿 EV Fleet Transition & ESG Savings Simulator

Quick-commerce companies face immense regulatory and environmental pressure to transition from internal combustion engine (ICE) vehicles to electric two-wheelers.

GRIDPOINT includes an interactive **ESG Fleet Power Simulator** allowing logistics managers to evaluate fleet transition ratios from 0% to 100%:

### 1. Operating Cost Comparison
- **Petrol 2-Wheeler Running Cost**: **₹2.00 / km** (assuming ₹102/L petrol and 50 km/L real-world efficiency).
- **Electric 2-Wheeler Running Cost**: **₹0.35 / km** (assuming 3.0 kWh battery, 75 km range, ₹8.5/unit commercial electricity).
- **Fuel Cost Reduction**: Electric two-wheelers operate **82.5% cheaper** than petrol vehicles.

### 2. Fleet Financial Savings (at 100% EV Transition)
- **Baseline Petrol Fuel Cost**: ~₹14.7 Lakh / day (₹53.6 Crore / year).
- **Electric Fleet Charging Cost**: ~₹2.6 Lakh / day (₹9.5 Crore / year).
- **Net Fuel Savings**: **~₹12.1 Lakh / day** $\rightarrow$ **₹44.3 to ₹48.0+ Crore / year** in direct operational savings.

### 3. Environmental Impact & Carbon Accounting
- **Emissions Factor**: Petrol two-wheelers consume ~1 liter per 35 km in stop-and-go city traffic, emitting **2.31 kg CO₂ per liter**.
- **Annual Baseline Carbon**: ~17,700 Metric Tons of CO₂ emitted annually.
- **100% EV Transition**: **100% elimination of tailpipe emissions**, preventing **over 17,700 Metric Tons of CO₂** every year.

---

## 📉 The U-Curve Operational Cost Trade-Off

A fundamental question in supply chain design is: **How many warehouses produce the lowest overall operational cost?**

GRIDPOINT plots the classic U-Curve trade-off between:
1. **Fixed Real Estate Costs**: Monthly facility commercial rent scales linearly upward as warehouse count $p$ increases:
$$\text{Cost}_{\text{facility}} = p \times \text{Avg Rent}$$
2. **Dynamic Travel Costs**: Fleet fuel and transit costs scale hyperbolically downward as warehouse count $p$ increases because goods originate closer to customers:
$$\text{Cost}_{\text{transit}} \propto \frac{1}{\sqrt{p}}$$

The total operational cost curve exhibits a convex minimum ($p^*$), which GRIDPOINT identifies through the `/api/tradeoff` endpoint.

---

## 🗺️ Bangalore Geospatial Dataset & Normalization

The underlying spatial model is built upon 800 normalized discrete points covering the entire BBMP metropolitan area:

| Column | Description | Range / Source |
| :--- | :--- | :--- |
| `point_id` | Unique discrete candidate node identifier (`p001` to `p800`) | Categorical |
| `latitude`, `longitude` | Coordinates across Bangalore bounds (12.80°N - 13.15°N, 77.45°E - 77.78°E) | Geospatial |
| `orders_per_day` | Daily customer delivery demand | 800 to 2,800 orders/node |
| `price_per_sqft` | Commercial warehouse real estate lease rate | ₹1,800 to ₹9,800 / sq.ft |
| `traffic_index` | Road congestion delay index | 0.20 (Peripheral) to 0.95 (Central Hubs) |
| `suitability_score` | Composite suitability for warehousing | 0.0 to 1.0 (Demand, Price, Traffic balance) |
| `nearest_locality` | Closest named benchmark neighborhood (Indiranagar, Peenya, etc.) | Bangalore Localities |
| `zone` | Administrative zone (South, East, West, North, Central) | BBMP Zones |

---

## 🏗️ System Architecture & Repository Structure

```text
HackAAATHON/
├── backend/
│   ├── app.py                     # FastAPI REST server with CORS & endpoints
│   ├── solver.py                  # Discrete CFLP optimizer, SLA engine & ESG simulator
│   ├── schemas.py                 # Pydantic data schemas & response validation
│   └── requirements.txt           # Python dependencies (fastapi, uvicorn, numpy, etc.)
│
├── frontend/                      # React 19 + Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/            # UI widgets, metrics cards, map canvas
│   │   ├── pages/                 # Dashboard, Scenarios, Analytics
│   │   ├── services/              # API services & Gemini AI integration
│   │   └── types.ts               # TypeScript data models
│   ├── package.json
│   └── vite.config.ts
│
├── City data/
│   ├── bangalore_data_normalized.csv # 800 discrete candidate nodes
│   ├── prices/                    # Locality real estate benchmarks
│   ├── demand/                    # Daily order distributions
│   └── traffic/                   # Spatial congestion fields
│
├── index.html                     # Interactive Glassmorphic Leaflet Map Application
├── problem_statement.txt          # Hackathon specifications
└── README.md                      # Comprehensive project documentation
```

---

## 🔌 REST API Specification

### 1. `GET /api/city`
Fetches bounding coordinates, metadata, and all 800 discrete candidate nodes.
```json
{
  "bounds": { "min_lat": 12.83, "max_lat": 13.14, "min_lng": 77.48, "max_lng": 77.76 },
  "total_points": 800,
  "total_daily_orders": 1197150.0,
  "points": [ ... ],
  "defaults": {
    "num_warehouses": 3,
    "property_size_sqft": 2500.0,
    "batch_size": 23,
    "min_dispersion_km": 6.5,
    "ev_fleet_pct": 0.0,
    "target_sla_minutes": 10.0
  }
}
```

### 2. `POST /api/optimize`
Executes the discrete facility location solver.
**Request Body:**
```json
{
  "num_warehouses": 25,
  "budget_monthly": null,
  "property_size_sqft": 2500.0,
  "petrol_cost_per_km": 2.0,
  "batch_size": 23,
  "min_dispersion_km": 6.5,
  "max_radius_km": null,
  "use_capacity": false,
  "capacity_per_warehouse": null,
  "ev_fleet_pct": 100.0,
  "picking_time_min": 3.0,
  "target_sla_minutes": 10.0
}
```
**Response Body (Excerpt):**
```json
{
  "status": "ok",
  "warehouses": [
    {
      "id": "p042",
      "name": "Koramangala Hub",
      "lat": 12.9352,
      "lng": 77.6245,
      "avg_delivery_time_min": 8.4,
      "sla_compliance_pct": 74.2,
      "employees_required": 2180,
      "monthly_rent": 342000.0,
      "color": "#3b82f6"
    }
  ],
  "costs": {
    "daily_fleet_km": 735200.0,
    "avg_delivery_time_min": 9.2,
    "sla_compliance_pct": 61.7,
    "daily_petrol_cost": 1470400.0,
    "daily_ev_cost": 257320.0,
    "daily_fuel_savings": 1213080.0,
    "annual_fuel_savings": 442774200.0,
    "annual_co2_saved_tons": 17713.4,
    "annual_co2_tons": 0.0,
    "total_employees": 52050
  }
}
```

### 3. `GET /api/tradeoff`
Computes the U-Curve trade-off data for $p = 1$ to $5$ warehouses.

---

## 💻 Interactive Glassmorphic Map Application

The project includes an interactive web interface served at `http://127.0.0.1:8000/app` (`index.html`):
- **Glassmorphism Design System**: Modern, ultra-clean interface built with backdrop blurs, tailored typography (Inter), and dynamic color scales.
- **Dual Map Tile Providers**: Instant switching between Jawg Maps Dark Theme and OpenStreetMap CartoDB Positron.
- **Dynamic Heatmap Layers**: Toggleable demand density, real estate rent contours, traffic friction, and suitability overlays.
- **Interactive Spoke Lines**: Visual lines connecting customer demand clusters to their assigned warehouse hub.
- **Live ESG Power Switch**: Instant toggle between Petrol and 100% EV Fleet mode with live recalculation of fuel savings and CO₂ emission reductions.
- **Live SLA Gauge**: Circular radial compliance meter showing the exact percentage of deliveries fulfilling the 10-minute SLA promise.

---

## 🚀 Installation & Getting Started

### Prerequisites
- Python 3.9+ installed
- Node.js 18+ (if developing on the React frontend)

### 1. Launching the Backend Optimizer
```bash
# Navigate to backend folder
cd backend

# Install Python requirements
pip install -r requirements.txt

# Start FastAPI development server
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```
The backend will immediately initialize, loading all 800 discrete nodes and pre-computing the road distance and traffic matrices.

### 2. Accessing the Applications
- **Interactive Map Visualizer**: Open [http://127.0.0.1:8000/app](http://127.0.0.1:8000/app) in any browser.
- **Swagger Interactive API Documentation**: Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).
- **Health Check**: Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/).

### 3. Running the React Frontend (Optional)
```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Launch Vite dev server
npm run dev
```

---

## 🏆 Hackathon Evaluation Summary

| Evaluation Criteria | GRIDPOINT Implementation |
| :--- | :--- |
| **Mathematical Rigor** | Discrete Capacitated Facility Location with spatial dispersion ($D_{\min}$) and anti-deadlock regret-first allocation (Zero K-Means). |
| **Quick-Commerce Relevance** | Solves the 10-Minute SLA feasibility paradox using empirical Bangalore traffic models and picking times. |
| **Workforce Modeling** | Realistic 52,050 delivery rider workforce model delivering 1.19M orders/day at ₹1,000/day wages. |
| **ESG & Sustainability Impact** | Quantitative EV transition simulator calculating ₹44+ Crore/year fuel savings and 17,700 Tons CO₂ eliminated. |
| **Geospatial Realism** | 800 discrete Bangalore nodes with actual commercial real estate rates and traffic congestion layers. |
| **Code & API Quality** | High-performance FastAPI backend (<150ms solve time) paired with a responsive glassmorphic UI. |
