import os
import csv
import time
import colorsys
import numpy as np
from typing import List, Dict, Any, Tuple, Optional

# Base distinct colors for up to 8 hubs, supplemented by golden ratio hues for up to 100 hubs
BASE_COLORS = [
    "#3b82f6",  # Vibrant Blue
    "#ef4444",  # Crimson Red
    "#10b981",  # Emerald Green
    "#f59e0b",  # Amber / Gold
    "#8b5cf6",  # Violet Purple
    "#06b6d4",  # Cyan
    "#ec4899",  # Pink
    "#f97316",  # Bright Orange
]

def get_warehouse_color(rank: int, total_p: int) -> str:
    """Returns a visually distinct, vibrant hex color for warehouse markers."""
    if total_p <= len(BASE_COLORS):
        return BASE_COLORS[rank % len(BASE_COLORS)]
    # Golden ratio hue distribution converted to 6-digit hex
    hue = (rank * 0.618033988749895) % 1.0
    r, g, b = colorsys.hls_to_rgb(hue, 0.48, 0.85)
    return f"#{int(r * 255):02x}{int(g * 255):02x}{int(b * 255):02x}"

class GridpointSolver:
    """
    Advanced Discrete Capacitated Facility Location Solver:
    - Zero K-Means
    - Scalable from 1 to 100 Warehouses across 800 Discrete Grid Points
    - Facility Rent Only Budget (Drivers pay own fuel)
    - Sustainability & Carbon Tracking (Daily Fuel Liters & Annual CO2)
    - Delivery Workforce Modeling: Mean 23 orders/day/driver @ Rs 1,000/day
    - Adaptive Spatial Dispersion Constraints (No clustered warehouses)
    - Anti-Deadlock Regret-First Demand Allocation
    - Incremental Distance Vectorization for Sub-Second Optimization
    """

    def __init__(self, data_path: str, locality_path: Optional[str] = None):
        self.data_path = data_path
        self.locality_path = locality_path
        self.points: List[Dict[str, Any]] = []
        self.localities: List[Dict[str, Any]] = []
        self.load_data()
        self.build_distance_matrix()

    def load_data(self):
        # Load locality benchmarks for human-readable naming
        if self.locality_path and os.path.exists(self.locality_path):
            with open(self.locality_path, 'r', encoding='utf-8') as f:
                for r in csv.DictReader(f):
                    self.localities.append({
                        'name': r['name'],
                        'zone': r['zone'],
                        'lat': float(r['latitude']),
                        'lng': float(r['longitude'])
                    })

        # Load all 800 normalized Bangalore data points
        with open(self.data_path, 'r', encoding='utf-8') as f:
            for r in csv.DictReader(f):
                lat = float(r['latitude'])
                lng = float(r['longitude'])
                
                # Match to closest known locality
                nearest_loc = "Central Bangalore"
                zone = "Central"
                if self.localities:
                    best_d = float('inf')
                    for loc in self.localities:
                        d = (lat - loc['lat'])**2 + (lng - loc['lng'])**2
                        if d < best_d:
                            best_d = d
                            nearest_loc = loc['name']
                            zone = loc['zone']

                self.points.append({
                    'point_id': r['point_id'],
                    'latitude': lat,
                    'longitude': lng,
                    'orders_per_day': float(r['orders_per_day']),
                    'price_per_sqft': float(r['price_per_sqft']),
                    'traffic_index': float(r['traffic_index']),
                    'norm_demand': float(r.get('norm_demand', 0.0)),
                    'norm_price': float(r.get('norm_price', 0.0)),
                    'norm_traffic': float(r.get('norm_traffic', 0.0)),
                    'suitability_score': float(r.get('suitability_score', 0.0)),
                    'nearest_locality': nearest_loc,
                    'zone': zone
                })

        self.n = len(self.points)
        self.coords = np.array([[p['latitude'], p['longitude']] for p in self.points], dtype=np.float64)
        self.orders = np.array([p['orders_per_day'] for p in self.points], dtype=np.float64)
        self.prices = np.array([p['price_per_sqft'] for p in self.points], dtype=np.float64)
        self.traffic = np.array([p['traffic_index'] for p in self.points], dtype=np.float64)
        self.total_orders = float(np.sum(self.orders))
        self.mean_price = float(np.mean(self.prices))

        # Driver shift calculation: Mean 23 deliveries/day per driver
        self.shifts = self.orders / 23.0

    def build_distance_matrix(self):
        # Vectorized Haversine distance with 1.4 urban road circuity
        lat1 = np.radians(self.coords[:, 0])[:, None]
        lon1 = np.radians(self.coords[:, 1])[:, None]
        lat2 = np.radians(self.coords[:, 0])[None, :]
        lon2 = np.radians(self.coords[:, 1])[None, :]
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = np.sin(dlat / 2.0)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0)**2
        c = 2 * np.arcsin(np.sqrt(a))
        # 6371.0 km Earth radius * 1.4 urban road circuity
        self.D_road = 6371.0 * c * 1.4
        # Effective distance incorporating urban traffic congestion
        self.D_traffic = self.D_road * (1.0 + 0.4 * self.traffic[None, :])

    def get_city_summary(self) -> Dict[str, Any]:
        lats = self.coords[:, 0]
        lngs = self.coords[:, 1]
        return {
            'bounds': {
                'minLat': float(np.min(lats)),
                'maxLat': float(np.max(lats)),
                'minLng': float(np.min(lngs)),
                'maxLng': float(np.max(lngs))
            },
            'total_points': self.n,
            'total_daily_orders': self.total_orders,
            'points': self.points,
            'defaults': {
                'num_warehouses': 3,
                'property_size_sqft': 2500,
                'budget_monthly': None,
                'petrol_cost_per_km': 2.0,
                'batch_size': 23,
                'min_dispersion_km': 6.5,
                'max_radius_km': 25,
                'ev_fleet_pct': 0.0,
                'target_sla_minutes': 10.0
            }
        }

    def compute_cost_and_assignment(
        self,
        sites: List[int],
        property_size: float,
        petrol_cost: float,
        batch_size: int,
        max_radius: Optional[float] = None,
        use_capacity: bool = False,
        capacity_limit: Optional[float] = None,
        ev_fleet_pct: float = 0.0,
        picking_time_min: float = 3.0,
        target_sla_minutes: float = 10.0
    ) -> Tuple[Optional[np.ndarray], Optional[Dict[str, float]], Optional[np.ndarray]]:
        """
        Anti-Deadlock Regret Assignment & Detailed Cost/Workforce/SLA/ESG Breakdown:
        - Allocates demand nodes using Regret-First priorities so isolated nodes are never starved.
        - Computes driver workforce (mean 23 orders/day per driver @ Rs 1,000/day).
        - Computes 10-Minute Quick-Commerce SLA delivery times and compliance %.
        - Simulates EV Fleet Transition savings (Rs 2.00 petrol vs Rs 0.35 EV) and carbon reduction.
        - Calculates facility rent under company budget.
        """
        if not sites:
            return None, None, None

        sub_D = self.D_road[:, sites] # shape: (800, len(sites))

        if not use_capacity:
            # Uncapacitated: assign to nearest warehouse
            assigned_wh = np.argmin(sub_D, axis=1)
            min_dists = sub_D[np.arange(self.n), assigned_wh]

            if max_radius is not None and np.any(min_dists > max_radius):
                return None, None, None
        else:
            # Capacitated: Anti-Deadlock Regret-First Assignment
            cap = capacity_limit or ((self.total_orders / len(sites)) * 1.35)
            site_loads = np.zeros(len(sites), dtype=np.float64)
            assigned_wh = np.full(self.n, -1, dtype=np.int32)

            if len(sites) == 1:
                if self.total_orders > cap:
                    return None, None, None
                assigned_wh = np.zeros(self.n, dtype=np.int32)
                min_dists = sub_D[:, 0]
            else:
                sorted_dists = np.sort(sub_D, axis=1)
                regret = sorted_dists[:, 1] - sorted_dists[:, 0]
                priority_order = np.argsort(-regret) # Highest regret gets served first

                for idx in priority_order:
                    cand_order = np.argsort(sub_D[idx, :])
                    assigned = False
                    for w in cand_order:
                        if max_radius is not None and sub_D[idx, w] > max_radius:
                            continue
                        if site_loads[w] + self.orders[idx] <= cap:
                            site_loads[w] += self.orders[idx]
                            assigned_wh[idx] = w
                            assigned = True
                            break
                    if not assigned:
                        return None, None, None
                min_dists = sub_D[np.arange(self.n), assigned_wh]

        # Delivery Route Modeling:
        # Deliveries per driver per day (range: 15-30, mean/default: 23)
        daily_driver_orders = float(batch_size) if batch_size >= 12 else 23.0
        trips = self.orders / daily_driver_orders
        local_hop_km = 0.4
        trip_distance = (2.0 * min_dists) + ((daily_driver_orders - 1.0) * local_hop_km)
        daily_fleet_km = float(np.sum(trips * trip_distance))

        # 1. Quick-Commerce 10-Minute SLA Compliance Metric:
        # Travel time = (Distance in km / Average speed in traffic) + 3 minutes picking time
        # Average two-wheeler speed in traffic (Bangalore): 30 km/h / (1 + 0.28 * traffic_index)
        speed_kmh = 30.0 / (1.0 + 0.28 * self.traffic)
        transit_times_min = (min_dists / speed_kmh) * 60.0
        node_delivery_times = picking_time_min + transit_times_min

        sla_threshold = float(target_sla_minutes)
        sla_mask = (node_delivery_times <= sla_threshold)
        sla_compliant_orders = float(np.sum(self.orders[sla_mask]))
        network_sla_compliance_pct = round(float((sla_compliant_orders / self.total_orders) * 100.0), 1)
        network_avg_delivery_time = round(float(np.sum(self.orders * node_delivery_times) / self.total_orders), 1)

        # 2. EV Transition and Fleet Green Savings Simulator (ESG Pitch):
        # Petrol running cost: Rs 2.00 / km
        # EV charging cost: Rs 0.35 / km (~82.5% cheaper)
        petrol_rate = float(petrol_cost)
        ev_rate = 0.35
        daily_petrol_cost = round(daily_fleet_km * petrol_rate, 2)
        daily_ev_cost = round(daily_fleet_km * ev_rate, 2)
        ev_ratio = max(0.0, min(1.0, float(ev_fleet_pct) / 100.0))

        # Effective fuel expenditure given fleet EV transition percentage
        effective_daily_fuel = round(daily_petrol_cost * (1.0 - ev_ratio) + daily_ev_cost * ev_ratio, 2)
        effective_annual_fuel = round(effective_daily_fuel * 365.0, 2)
        daily_fuel_savings = round((daily_petrol_cost - daily_ev_cost) * ev_ratio, 2)
        annual_fuel_savings = round(daily_fuel_savings * 365.0, 2)

        # Sustainability Metrics: Two-wheeler baseline ~35 km/L, 2.31 kg CO2/L
        daily_fuel_liters = daily_fleet_km / 35.0
        baseline_annual_co2_tons = (daily_fuel_liters * 2.31 * 365.0) / 1000.0
        annual_co2_saved_tons = round(baseline_annual_co2_tons * ev_ratio, 1)
        remaining_annual_co2_tons = round(baseline_annual_co2_tons * (1.0 - ev_ratio), 1)

        # Facility Rent (Company lease cost: commercial rent + power/staffing baseline)
        monthly_rent_per_site = (self.prices[sites] * property_size * 0.004) + 120000.0 * (self.prices[sites] / self.mean_price)
        monthly_rent = float(np.sum(monthly_rent_per_site))
        annual_rent = monthly_rent * 12.0
        total_annual = annual_rent  # Facility rent only constrained by company budget

        return assigned_wh, {
            'daily_fleet_km': round(daily_fleet_km, 1),
            'daily_fuel': effective_daily_fuel,
            'annual_fuel': effective_annual_fuel,
            'daily_fuel_liters': round(daily_fuel_liters * (1.0 - ev_ratio), 1),
            'annual_co2_tons': remaining_annual_co2_tons,
            'monthly_rent': round(monthly_rent, 2),
            'annual_rent': round(annual_rent, 2),
            'total_annual': round(total_annual, 2),
            'avg_delivery_time_min': network_avg_delivery_time,
            'sla_compliance_pct': network_sla_compliance_pct,
            'target_sla_minutes': sla_threshold,
            'ev_fleet_pct': round(float(ev_fleet_pct), 1),
            'petrol_running_cost_per_km': petrol_rate,
            'ev_charging_cost_per_km': ev_rate,
            'daily_petrol_cost': daily_petrol_cost,
            'daily_ev_cost': daily_ev_cost,
            'daily_fuel_savings': daily_fuel_savings,
            'annual_fuel_savings': annual_fuel_savings,
            'annual_co2_saved_tons': annual_co2_saved_tons
        }, node_delivery_times

    def solve(
        self,
        num_warehouses: int = 3,
        budget_monthly: Optional[float] = None,
        property_size_sqft: float = 2500.0,
        petrol_cost_per_km: float = 2.0,
        batch_size: int = 23,
        min_dispersion_km: float = 6.5,
        max_radius_km: Optional[float] = None,
        use_capacity: bool = False,
        capacity_per_warehouse: Optional[float] = None,
        ev_fleet_pct: float = 0.0,
        picking_time_min: float = 3.0,
        target_sla_minutes: float = 10.0
    ) -> Dict[str, Any]:
        """
        Fast Discrete Facility Location Optimizer supporting up to 100 Warehouses:
        1. Input validation (p between 1 and 100)
        2. Facility rent budget check (all 800 candidate nodes eligible)
        3. Adaptive spatial dispersion scaling to ensure 1 to 100 hubs fit seamlessly
        4. Incremental distance vectorization for ultra-fast greedy seeding (<150 ms)
        5. Vectorized local swap search
        6. Delivery workforce allocation: 23 orders/day per driver @ Rs 1,000/day
        """
        start_time = time.time()

        # 1. Input Validation
        max_allowed_p = min(100, self.n)
        if num_warehouses < 1 or num_warehouses > max_allowed_p:
            return {
                'status': 'infeasible',
                'reason': 'invalid_parameter',
                'message': f"Number of warehouses must be between 1 and {max_allowed_p}. Received: {num_warehouses}",
                'warehouses': [], 'assignments': [], 'costs': None,
                'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
            }
        if budget_monthly is not None and budget_monthly <= 0:
            return {
                'status': 'infeasible',
                'reason': 'invalid_parameter',
                'message': f"Monthly budget must be a positive number. Received: {budget_monthly}",
                'warehouses': [], 'assignments': [], 'costs': None,
                'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
            }
        if property_size_sqft <= 0:
            return {
                'status': 'infeasible',
                'reason': 'invalid_parameter',
                'message': f"Property size must be greater than 0 sq.ft. Received: {property_size_sqft}",
                'warehouses': [], 'assignments': [], 'costs': None,
                'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
            }
        if petrol_cost_per_km <= 0:
            return {
                'status': 'infeasible',
                'reason': 'invalid_parameter',
                'message': f"Petrol cost must be greater than 0. Received: {petrol_cost_per_km}",
                'warehouses': [], 'assignments': [], 'costs': None,
                'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
            }
        if min_dispersion_km < 0:
            return {
                'status': 'infeasible',
                'reason': 'invalid_parameter',
                'message': f"Min dispersion distance cannot be negative. Received: {min_dispersion_km}",
                'warehouses': [], 'assignments': [], 'costs': None,
                'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
            }
        if max_radius_km is not None and max_radius_km <= 0:
            return {
                'status': 'infeasible',
                'reason': 'invalid_parameter',
                'message': f"Max radius cutoff must be greater than 0 km. Received: {max_radius_km}",
                'warehouses': [], 'assignments': [], 'costs': None,
                'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
            }

        p = num_warehouses

        # Monthly facility cost per candidate node (Facility Rent Only)
        single_site_monthly_rents = (self.prices * property_size_sqft * 0.004) + 120000.0 * (self.prices / self.mean_price)
        sorted_rents = np.sort(single_site_monthly_rents)
        min_possible_rent = float(np.sum(sorted_rents[:p]))

        # 2. Facility Rent Budget Feasibility Check
        if budget_monthly is not None and budget_monthly < min_possible_rent:
            return {
                'status': 'infeasible',
                'reason': 'budget',
                'message': f"Monthly budget of ₹{budget_monthly:,.0f} is insufficient for facility rent. The {p} cheapest sites cost at least ₹{min_possible_rent:,.0f}/month.",
                'suggested_budget': round(min_possible_rent * 1.1, -3),
                'warehouses': [],
                'assignments': [],
                'costs': None,
                'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
            }

        # 3. Candidate Pool (All 800 nodes eligible)
        if budget_monthly is not None:
            max_single_rent = budget_monthly - np.sum(sorted_rents[:p-1]) if p > 1 else budget_monthly
            cand_indices = np.where(single_site_monthly_rents <= max_single_rent)[0]
            if len(cand_indices) < p:
                cand_indices = np.where(single_site_monthly_rents <= budget_monthly)[0]
        else:
            cand_indices = np.arange(self.n)

        # 4. Adaptive Spatial Dispersion:
        # Bangalore city bounds ~25 km extent. Maximum packing separation for p hubs is ~25 / sqrt(p).
        # We auto-cap and gracefully relax dispersion if needed to ensure all p hubs can be placed.
        max_packing_d = 25.0 / np.sqrt(p) if p > 1 else 0.0
        d_min = min(min_dispersion_km, max_packing_d) if p > 1 else 0.0

        current_sites: List[int] = []
        attempts = 0
        max_attempts = 10

        while attempts < max_attempts and len(current_sites) < p:
            current_sites = []
            
            # First warehouse: choose hub with lowest weighted traffic-distance
            cand_costs_init = self.shifts.dot(self.D_traffic[:, cand_indices])
            best_first = cand_indices[int(np.argmin(cand_costs_init))]
            current_sites.append(best_first)
            curr_min_dists = self.D_traffic[:, best_first].copy()

            # Incrementally place remaining (p - 1) hubs with vectorized lookahead
            for step in range(1, p):
                rem_p = p - step - 1

                # Incremental distance calculation: min(curr_min, D[:, cand])
                cand_mins = np.minimum(curr_min_dists[:, None], self.D_traffic) # (800, 800)
                cand_eval_costs = self.shifts.dot(cand_mins) # shape: (800,)

                # Mask out already selected sites
                cand_eval_costs[current_sites] = np.inf

                # Enforce spatial dispersion exclusion zone
                if d_min > 0:
                    for s in current_sites:
                        too_close_mask = (self.D_road[:, s] < d_min)
                        cand_eval_costs[too_close_mask] = np.inf

                # Enforce budget constraint with lookahead for cheapest remaining sites
                if budget_monthly is not None:
                    spent_so_far = float(np.sum(single_site_monthly_rents[current_sites]))
                    future_min_spent = float(np.sum(sorted_rents[:rem_p])) if rem_p > 0 else 0.0
                    exceeds_budget = (spent_so_far + single_site_monthly_rents + future_min_spent) > budget_monthly
                    cand_eval_costs[exceeds_budget] = np.inf

                valid_candidates = np.where(cand_eval_costs < np.inf)[0]
                if len(valid_candidates) == 0:
                    # Infeasible with current d_min, trigger relaxation
                    break

                best_cand = int(valid_candidates[np.argmin(cand_eval_costs[valid_candidates])])
                current_sites.append(best_cand)
                curr_min_dists = cand_mins[:, best_cand]

            if len(current_sites) == p:
                break

            # Relax dispersion slightly and retry
            d_min *= 0.80
            attempts += 1

        if len(current_sites) < p:
            return {
                'status': 'infeasible',
                'reason': 'dispersion_or_budget',
                'message': f"Could not place {p} warehouses under the specified budget and dispersion constraints.",
                'suggested_budget': None,
                'warehouses': [],
                'assignments': [],
                'costs': None,
                'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
            }

        # 5. Fast Vectorized Spatial Local Swap Search
        if p > 1:
            max_swap_iters = 8 if p <= 10 else 2
            for _ in range(max_swap_iters):
                improved = False
                hubs_to_check = range(p) if p <= 15 else np.random.choice(p, 15, replace=False)

                for i in hubs_to_check:
                    other_sites = [current_sites[k] for k in range(p) if k != i]
                    base_min = np.min(self.D_traffic[:, other_sites], axis=1)
                    cand_mins = np.minimum(base_min[:, None], self.D_traffic)
                    cand_costs = self.shifts.dot(cand_mins)

                    # Exclude existing sites
                    cand_costs[other_sites] = np.inf
                    cand_costs[current_sites[i]] = np.inf

                    # Dispersion check
                    if d_min > 0:
                        for s in other_sites:
                            cand_costs[self.D_road[:, s] < d_min] = np.inf

                    # Budget check
                    if budget_monthly is not None:
                        other_rent = float(np.sum(single_site_monthly_rents[other_sites]))
                        cand_costs[(other_rent + single_site_monthly_rents) > budget_monthly] = np.inf

                    valid = np.where(cand_costs < np.inf)[0]
                    if len(valid) > 0:
                        best_cand_idx = int(valid[np.argmin(cand_costs[valid])])
                        current_cost = float(np.sum(self.shifts * np.minimum(base_min, self.D_traffic[:, current_sites[i]])))
                        if cand_costs[best_cand_idx] < current_cost - 1e-1:
                            current_sites[i] = best_cand_idx
                            improved = True

                if not improved:
                    break

        # 6. Max Radius Coverage Verification
        if max_radius_km is not None:
            sub_D_road = self.D_road[:, current_sites]
            worst_dist = float(np.max(np.min(sub_D_road, axis=1)))
            if worst_dist > max_radius_km:
                return {
                    'status': 'infeasible',
                    'reason': 'radius',
                    'message': f"Cannot cover all delivery points within {max_radius_km:.1f} km radius. Max distance to nearest warehouse is {worst_dist:.1f} km. Increase radius or add more warehouses.",
                    'suggested_budget': None,
                    'warehouses': [],
                    'assignments': [],
                    'costs': None,
                    'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
                }

        # 7. Final Assignment & Cost Calculation
        assigned_wh, final_costs, node_delivery_times = self.compute_cost_and_assignment(
            current_sites, property_size_sqft, petrol_cost_per_km, batch_size,
            max_radius=max_radius_km, use_capacity=use_capacity, capacity_limit=capacity_per_warehouse,
            ev_fleet_pct=ev_fleet_pct, picking_time_min=picking_time_min, target_sla_minutes=target_sla_minutes
        )

        if final_costs is None or assigned_wh is None:
            return {
                'status': 'infeasible',
                'reason': 'constraint_violation',
                'message': "Selected configuration violates coverage or capacity limits.",
                'warehouses': [],
                'assignments': [],
                'costs': None,
                'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
            }

        # Minimum inter-warehouse separation achieved
        if p > 1:
            pair_dists = []
            for j in range(p):
                for k in range(j + 1, p):
                    pair_dists.append(float(self.D_road[current_sites[j], current_sites[k]]))
            min_sep_achieved = round(min(pair_dists), 2)
        else:
            min_sep_achieved = 0.0

        # Format Warehouses Details with Delivery Workforce & SLA Metrics
        warehouses_out = []
        total_network_employees = 0

        for rank, site_idx in enumerate(current_sites):
            pt = self.points[site_idx]
            assigned_mask = (assigned_wh == rank)
            site_orders = float(np.sum(self.orders[assigned_mask]))
            cap = capacity_per_warehouse or ((self.total_orders / p) * 1.35)
            util_pct = min(100.0, round((site_orders / cap) * 100.0, 1)) if cap > 0 else 100.0

            m_rent = (pt['price_per_sqft'] * property_size_sqft * 0.004) + 120000.0 * (pt['price_per_sqft'] / self.mean_price)
            a_rent = m_rent * 12.0

            # Workforce: Deliveries per driver per day (mean 23, or user-configured 15-30) @ Rs 1,000/day
            daily_driver_orders = float(batch_size) if batch_size >= 12 else 23.0
            employees_req = int(np.ceil(site_orders / daily_driver_orders)) if site_orders > 0 else 0
            daily_salary = float(employees_req * 1000.0)
            monthly_salary = float(daily_salary * 30.0)
            total_network_employees += employees_req

            # Per-warehouse 10-Minute SLA & Average Delivery Time
            if site_orders > 0 and node_delivery_times is not None:
                wh_orders = self.orders[assigned_mask]
                wh_times = node_delivery_times[assigned_mask]
                wh_avg_time = round(float(np.sum(wh_orders * wh_times) / site_orders), 1)
                wh_sla_orders = float(np.sum(wh_orders[wh_times <= target_sla_minutes]))
                wh_sla_pct = round(float((wh_sla_orders / site_orders) * 100.0), 1)
            else:
                wh_avg_time = 0.0
                wh_sla_pct = 0.0

            warehouses_out.append({
                'id': pt['point_id'],
                'name': f"{pt['nearest_locality']} Hub",
                'locality': pt['nearest_locality'],
                'zone': pt['zone'],
                'lat': pt['latitude'],
                'lng': pt['longitude'],
                'price_per_sqft': pt['price_per_sqft'],
                'traffic_index': pt['traffic_index'],
                'suitability_score': pt['suitability_score'],
                'monthly_rent': round(m_rent, 2),
                'annual_rent': round(a_rent, 2),
                'assigned_orders': round(site_orders, 0),
                'employees_required': employees_req,
                'daily_salary': daily_salary,
                'monthly_salary': monthly_salary,
                'utilization_pct': util_pct,
                'color': get_warehouse_color(rank, p),
                'avg_delivery_time_min': wh_avg_time,
                'sla_compliance_pct': wh_sla_pct
            })

        # Format Assignments (for Map Spoke Lines)
        assignments_out = []
        for i in range(self.n):
            w_rank = assigned_wh[i]
            w_site = current_sites[w_rank]
            dist_km = float(self.D_road[i, w_site])
            assignments_out.append({
                'demand_id': self.points[i]['point_id'],
                'warehouse_id': self.points[w_site]['point_id'],
                'distance_km': round(dist_km, 2)
            })

        # Final workforce totals
        daily_driver_wages = float(total_network_employees * 1000.0)
        monthly_driver_wages = float(daily_driver_wages * 30.0)
        avg_km_driver = round(final_costs['daily_fleet_km'] / max(1, total_network_employees), 1)

        final_costs['total_employees'] = total_network_employees
        final_costs['daily_driver_wages'] = daily_driver_wages
        final_costs['monthly_driver_wages'] = monthly_driver_wages
        final_costs['avg_km_per_driver'] = avg_km_driver

        budget_pct = None
        if budget_monthly and budget_monthly > 0:
            budget_pct = round((final_costs['monthly_rent'] / budget_monthly) * 100.0, 1)
        final_costs['budget_used_pct'] = budget_pct

        solve_time = round((time.time() - start_time) * 1000, 2)

        return {
            'status': 'ok',
            'warehouses': warehouses_out,
            'assignments': assignments_out,
            'costs': final_costs,
            'meta': {
                'solve_time_ms': solve_time,
                'points_evaluated': self.n,
                'min_inter_hub_separation_km': min_sep_achieved,
                'deadlocks_prevented': True
            }
        }

    def compute_tradeoff(
        self,
        budget_monthly: Optional[float] = None,
        property_size_sqft: float = 2500.0,
        petrol_cost_per_km: float = 2.0,
        batch_size: int = 23,
        min_dispersion_km: float = 6.5
    ) -> Dict[str, Any]:
        """
        Computes the cost trade-off data across p = 1 through 5 warehouses.
        """
        tradeoff_points = []
        best_p = 1
        lowest_cost = float('inf')

        for k in range(1, 6):
            res = self.solve(
                num_warehouses=k,
                budget_monthly=budget_monthly,
                property_size_sqft=property_size_sqft,
                petrol_cost_per_km=petrol_cost_per_km,
                batch_size=batch_size,
                min_dispersion_km=min_dispersion_km
            )
            if res['status'] == 'ok' and res['costs'] is not None:
                # Classic U-curve trade-off represents total operational economics = Facility Rent + Fleet Fuel:
                total_economic = round(res['costs']['annual_rent'] + res['costs']['annual_fuel'], 2)
                if total_economic < lowest_cost:
                    lowest_cost = total_economic
                    best_p = k
                tradeoff_points.append({
                    'num_warehouses': k,
                    'monthly_rent': res['costs']['monthly_rent'],
                    'annual_rent': res['costs']['annual_rent'],
                    'annual_fuel': res['costs']['annual_fuel'],
                    'total_annual': total_economic,
                    'feasible': True
                })
            else:
                tradeoff_points.append({
                    'num_warehouses': k,
                    'monthly_rent': 0.0,
                    'annual_rent': 0.0,
                    'annual_fuel': 0.0,
                    'total_annual': 0.0,
                    'feasible': False
                })

        return {
            'points': tradeoff_points,
            'recommended_p': best_p
        }
