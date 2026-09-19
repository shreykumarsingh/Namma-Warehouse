import os
import csv
import time
import numpy as np
from typing import List, Dict, Any, Tuple, Optional

# Color palette for distinct hub visualization on maps
WAREHOUSE_COLORS = [
    "#3b82f6",  # Vibrant Blue
    "#ef4444",  # Crimson Red
    "#10b981",  # Emerald Green
    "#f59e0b",  # Amber / Gold
    "#8b5cf6",  # Violet Purple
    "#06b6d4",  # Cyan
    "#ec4899",  # Pink
    "#f97316",  # Bright Orange
]

class GridpointSolver:
    """
    Advanced Discrete Capacitated Facility Location Solver with:
    - Zero K-Means
    - Spatial Dispersion Exclusion Constraints (No clustered warehouses)
    - Regret-First Anti-Deadlock Demand Allocation
    - 3-Delivery Order Batching (Milk-Run Routing)
    """

    def __init__(self, data_path: str, locality_path: Optional[str] = None):
        self.data_path = data_path
        self.locality_path = locality_path
        self.points: List[Dict[str, Any]] = []
        self.localities: List[Dict[str, Any]] = []
        self.load_data()
        self.build_distance_matrix()

    def load_data(self):
        # Load locality benchmarks for friendly naming
        if self.locality_path and os.path.exists(self.locality_path):
            with open(self.locality_path, 'r', encoding='utf-8') as f:
                for r in csv.DictReader(f):
                    self.localities.append({
                        'name': r['name'],
                        'zone': r['zone'],
                        'lat': float(r['latitude']),
                        'lng': float(r['longitude'])
                    })

        # Load 800 normalized data points
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
        self.total_orders = float(np.sum(self.orders))

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
        # 6371.0 km radius * 1.4 road circuity
        self.D_road = 6371.0 * c * 1.4
        self.traffic = np.array([p['traffic_index'] for p in self.points], dtype=np.float64)
        self.mean_price = float(np.mean(self.prices))
        # Effective distance matrix incorporating urban traffic congestion penalty
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
                'budget_monthly': 1500000,
                'petrol_cost_per_km': 2.0,
                'batch_size': 3,
                'min_dispersion_km': 6.5,
                'max_radius_km': 25
            }
        }

    def _eval_fast(self, sites: List[int], annual_rents: np.ndarray, petrol_cost: float, B: int) -> float:
        """
        Vectorized evaluation of total annual cost incorporating urban traffic congestion
        and consolidated milk-run delivery routes.
        """
        sub_D = self.D_traffic[:, sites]
        min_dists = np.min(sub_D, axis=1)
        # Consolidated route dispatches: B orders per drop, ~15 drops per delivery route run
        route_trips = self.orders / (float(B) * 15.0)
        daily_km = np.sum(route_trips * (2.0 * min_dists + (B - 1) * 0.4))
        annual_fuel = daily_km * petrol_cost * 365.0
        tot_rent = np.sum(annual_rents[sites])
        return annual_fuel + tot_rent

    def compute_cost_and_assignment(
        self,
        sites: List[int],
        property_size: float,
        petrol_cost: float,
        batch_size: int,
        max_radius: Optional[float] = None,
        use_capacity: bool = False,
        capacity_limit: Optional[float] = None
    ) -> Tuple[Optional[np.ndarray], Optional[Dict[str, float]]]:
        """
        Anti-Deadlock Regret Assignment & Detailed Cost Breakdown:
        - Allocates demand nodes using Regret-First priorities so isolated/critical nodes are never starved.
        - Calculates batched milk-run fleet distance (B orders per trip) with traffic factors.
        - Computes facility rent + operational overhead.
        """
        if not sites:
            return None, None

        sub_D = self.D_road[:, sites] # shape: (800, len(sites))

        if not use_capacity:
            # Uncapacitated: assign to closest warehouse
            assigned_wh = np.argmin(sub_D, axis=1)
            min_dists = sub_D[np.arange(self.n), assigned_wh]

            if max_radius is not None and np.any(min_dists > max_radius):
                return None, None
        else:
            # Capacitated: Anti-Deadlock Regret-First Assignment
            # Default capacity per warehouse: (Total Orders / p) * 1.35
            cap = capacity_limit or ((self.total_orders / len(sites)) * 1.35)
            site_loads = np.zeros(len(sites), dtype=np.float64)
            assigned_wh = np.full(self.n, -1, dtype=np.int32)

            if len(sites) == 1:
                if self.total_orders > cap:
                    return None, None
                assigned_wh = np.zeros(self.n, dtype=np.int32)
                min_dists = sub_D[:, 0]
            else:
                # Calculate Regret: Delta = dist(2nd nearest) - dist(nearest)
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
                        # Deadlock prevented: flagged infeasible rather than silently stranding points
                        return None, None
                min_dists = sub_D[np.arange(self.n), assigned_wh]

        # Order Batching (B deliveries per trip):
        B = max(1, batch_size)
        route_trips = self.orders / (float(B) * 15.0)
        local_hop_km = 0.4
        trip_distance = (2.0 * min_dists) + ((B - 1) * local_hop_km)

        daily_km = float(np.sum(route_trips * trip_distance))
        # Traffic multiplier for actual fuel burn in urban congestion
        avg_traffic_factor = float(np.mean(1.0 + 0.4 * self.traffic))
        daily_fuel = daily_km * petrol_cost * avg_traffic_factor
        annual_fuel = daily_fuel * 365.0

        monthly_rent_per_site = (self.prices[sites] * property_size * 0.004) + 120000.0 * (self.prices[sites] / self.mean_price)
        monthly_rent = float(np.sum(monthly_rent_per_site))
        annual_rent = monthly_rent * 12.0
        total_annual = annual_fuel + annual_rent

        return assigned_wh, {
            'daily_fleet_km': round(daily_km, 1),
            'daily_fuel': round(daily_fuel, 2),
            'annual_fuel': round(annual_fuel, 2),
            'monthly_rent': round(monthly_rent, 2),
            'annual_rent': round(annual_rent, 2),
            'total_annual': round(total_annual, 2)
        }

    def solve(
        self,
        num_warehouses: int = 3,
        budget_monthly: Optional[float] = None,
        property_size_sqft: float = 2500.0,
        petrol_cost_per_km: float = 2.0,
        batch_size: int = 3,
        min_dispersion_km: float = 6.5,
        max_radius_km: Optional[float] = None,
        use_capacity: bool = False,
        capacity_per_warehouse: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Main optimization routine:
        1. Input validation for all parameters
        2. Budget viability check
        3. Dispersed Greedy Seeding with Spatial Exclusion Mask (D_min) & Budget Lookahead
        4. Spatial Tabu Local Swap Search enforcing D_min and budget
        5. Anti-deadlock assignment verification
        """
        start_time = time.time()

        # 1. Input Validation (guard against invalid / incorrect data)
        if num_warehouses < 1 or num_warehouses > min(8, self.n):
            return {
                'status': 'infeasible',
                'reason': 'invalid_parameter',
                'message': f"Number of warehouses must be between 1 and {min(8, self.n)}. Received: {num_warehouses}",
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
        if batch_size < 1:
            return {
                'status': 'infeasible',
                'reason': 'invalid_parameter',
                'message': f"Deliveries per trip (batch size) must be at least 1. Received: {batch_size}",
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
        B = max(1, batch_size)

        # Realistic monthly facility cost: real estate lease + operational staffing/power overhead
        single_site_monthly_rents = (self.prices * property_size_sqft * 0.004) + 120000.0 * (self.prices / self.mean_price)
        single_site_annual_rents = single_site_monthly_rents * 12.0
        sorted_rents = np.sort(single_site_monthly_rents)
        min_possible_rent = float(np.sum(sorted_rents[:p]))

        # 2. Budget Feasibility Check
        if budget_monthly is not None and budget_monthly < min_possible_rent:
            return {
                'status': 'infeasible',
                'reason': 'budget',
                'message': f"Monthly budget of ₹{budget_monthly:,.0f} is insufficient. The {p} cheapest sites cost at least ₹{min_possible_rent:,.0f}/month.",
                'suggested_budget': round(min_possible_rent * 1.1, -3),
                'warehouses': [],
                'assignments': [],
                'costs': None,
                'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
            }

        # 3. Spatial Dispersion Feasibility Check
        d_min = min_dispersion_km if p > 1 else 0.0
        if d_min > 0 and p > 1:
            max_city_dist = float(np.max(self.D_road))
            if d_min > max_city_dist * 0.7:
                return {
                    'status': 'infeasible',
                    'reason': 'dispersion_too_large',
                    'message': f"Min hub separation of {d_min:.1f} km exceeds Bangalore city extent (~{max_city_dist:.1f} km). Max feasible: ~{max_city_dist*0.35:.1f} km.",
                    'suggested_budget': None,
                    'warehouses': [],
                    'assignments': [],
                    'costs': None,
                    'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
                }

        # Candidate pool filtering based on budget
        if budget_monthly is not None:
            max_single_rent = budget_monthly - np.sum(sorted_rents[:p-1])
            cand_indices = np.where(single_site_monthly_rents <= max_single_rent)[0]
            if len(cand_indices) < p:
                cand_indices = np.where(single_site_monthly_rents <= budget_monthly)[0]
        else:
            cand_indices = np.arange(self.n)

        # 4. Dispersed Greedy Seeding with Spatial Exclusion Mask & Budget Lookahead
        current_sites: List[int] = []

        for step in range(p):
            best_cand = None
            best_cost = float('inf')
            rem_p = p - step - 1

            for cand in cand_indices:
                c_int = int(cand)
                if c_int in current_sites:
                    continue

                # Spatial Dispersion Exclusion Check:
                too_close = False
                for existing in current_sites:
                    if self.D_road[c_int, existing] < d_min:
                        too_close = True
                        break
                if too_close:
                    continue

                # Budget check with lookahead for remaining sites (prevents greedy deadlocks)
                test_sites = current_sites + [c_int]
                if budget_monthly is not None:
                    spent = float(np.sum(single_site_monthly_rents[test_sites]))
                    if rem_p > 0 and (spent + float(np.sum(sorted_rents[:rem_p]))) > budget_monthly:
                        continue
                    if spent > budget_monthly:
                        continue

                cost = self._eval_fast(test_sites, single_site_annual_rents, petrol_cost_per_km, B)
                if cost < best_cost:
                    best_cost = cost
                    best_cand = c_int

            if best_cand is not None:
                current_sites.append(best_cand)

        if len(current_sites) < p:
            return {
                'status': 'infeasible',
                'reason': 'dispersion_or_budget',
                'message': f"Could not place {p} warehouses satisfying minimum separation ({d_min:.1f} km) and budget constraints. Try reducing separation or increasing budget.",
                'suggested_budget': None,
                'warehouses': [],
                'assignments': [],
                'costs': None,
                'meta': {'solve_time_ms': round((time.time() - start_time) * 1000, 2)}
            }

        # 5. Fast Vectorized Spatial Local Swap Search
        improved = True
        iterations = 0
        max_iterations = 15

        while improved and iterations < max_iterations:
            improved = False
            iterations += 1
            curr_cost = self._eval_fast(current_sites, single_site_annual_rents, petrol_cost_per_km, B)
            best_cost = curr_cost
            best_swap = None

            for i in range(p):
                other_sites = [current_sites[k] for k in range(p) if k != i]

                for cand in cand_indices:
                    c_int = int(cand)
                    if c_int in current_sites:
                        continue

                    # Verify spatial dispersion with other open sites
                    too_close = False
                    for other in other_sites:
                        if self.D_road[c_int, other] < d_min:
                            too_close = True
                            break
                    if too_close:
                        continue

                    test_sites = list(current_sites)
                    test_sites[i] = c_int

                    if budget_monthly is not None and np.sum(single_site_monthly_rents[test_sites]) > budget_monthly:
                        continue

                    test_cost = self._eval_fast(test_sites, single_site_annual_rents, petrol_cost_per_km, B)
                    if test_cost < best_cost - 1e-1:
                        best_cost = test_cost
                        best_swap = (i, c_int)
                        improved = True

            if improved and best_swap is not None:
                sw_idx, sw_cand = best_swap
                current_sites[sw_idx] = sw_cand

        # 6. Max Radius Verification
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

        # 7. Final Detailed Evaluation & Anti-Deadlock Assignment
        assigned_wh, final_costs = self.compute_cost_and_assignment(
            current_sites, property_size_sqft, petrol_cost_per_km, batch_size,
            max_radius=max_radius_km, use_capacity=use_capacity, capacity_limit=capacity_per_warehouse
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

        # Format Warehouses Details
        warehouses_out = []
        for rank, site_idx in enumerate(current_sites):
            pt = self.points[site_idx]
            assigned_mask = (assigned_wh == rank)
            site_orders = float(np.sum(self.orders[assigned_mask]))
            cap = capacity_per_warehouse or ((self.total_orders / p) * 1.35)
            util_pct = min(100.0, round((site_orders / cap) * 100.0, 1)) if cap > 0 else 100.0

            m_rent = (pt['price_per_sqft'] * property_size_sqft * 0.004) + 120000.0 * (pt['price_per_sqft'] / self.mean_price)
            a_rent = m_rent * 12.0

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
                'utilization_pct': util_pct,
                'color': WAREHOUSE_COLORS[rank % len(WAREHOUSE_COLORS)]
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
                'iterations': iterations,
                'min_inter_hub_separation_km': min_sep_achieved,
                'deadlocks_prevented': True
            }
        }

    def compute_tradeoff(
        self,
        budget_monthly: Optional[float] = None,
        property_size_sqft: float = 2500.0,
        petrol_cost_per_km: float = 2.0,
        batch_size: int = 3,
        min_dispersion_km: float = 6.5
    ) -> Dict[str, Any]:
        """
        Computes the U-curve trade-off data for p = 1 through 5 warehouses.
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
                tot = res['costs']['total_annual']
                if tot < lowest_cost:
                    lowest_cost = tot
                    best_p = k
                tradeoff_points.append({
                    'num_warehouses': k,
                    'monthly_rent': res['costs']['monthly_rent'],
                    'annual_rent': res['costs']['annual_rent'],
                    'annual_fuel': res['costs']['annual_fuel'],
                    'total_annual': tot,
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
