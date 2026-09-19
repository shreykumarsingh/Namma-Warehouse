import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Polyline,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Warehouse as WarehouseIcon,
  Layers,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Navigation,
  Clock,
  IndianRupee,
  Activity,
  Maximize2,
} from 'lucide-react';
import { DemandZone, Warehouse, RouteAssignment, CityOption, GridPoint } from '../types';
import { BENGALURU_800_POINTS } from '../data/rawBengaluruPoints';
import {
  formatINR,
  formatNumber,
  formatPercent,
  formatMinutes,
  formatDistance,
} from '../utils/formatters';

interface LogisticsMapProps {
  city: CityOption;
  warehouses: Warehouse[];
  zones: DemandZone[];
  assignments: RouteAssignment[];
  customPoints?: GridPoint[];
}

// Controller component to reset view or pan to city center and auto-fit hubs
function MapViewController({
  center,
  zoom,
  warehouses,
  resetTrigger,
}: {
  center: [number, number];
  zoom: number;
  warehouses?: Warehouse[];
  resetTrigger?: number;
}) {
  const map = useMap();

  // Invalidate size to guarantee correct canvas dimensions and prevent blank map tiles
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  useEffect(() => {
    const selected = warehouses?.filter((w) => w.isSelected && w.lat && w.lng);
    if (selected && selected.length > 0) {
      const bounds = L.latLngBounds(selected.map((w) => [w.lat, w.lng]));
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13, animate: true });
    } else {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map, warehouses, resetTrigger]);

  return null;
}

// Helper to generate custom DivIcon for Warehouses
function createWarehouseIcon(isSelected: boolean, isOffline: boolean, id: string) {
  if (isOffline) {
    return L.divIcon({
      className: 'custom-warehouse-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: #EF4444; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(239,68,68,0.4); display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M4 10v10h16v-6"/><path d="M4 10 12 4l8 6"/></svg>
          </div>
          <span style="position: absolute; top: -18px; font-size: 10px; font-weight: 800; background: #1C1917; color: #FFFFFF; padding: 1px 5px; border-radius: 4px; white-space: nowrap; border: 1px solid #78716C;">
            ${id} (OFFLINE)
          </span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18],
    });
  }

  if (isSelected) {
    return L.divIcon({
      className: 'custom-warehouse-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(22, 163, 74, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 34px; height: 34px; border-radius: 9px; background: #15803D; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(21,128,61,0.5); display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style="position: absolute; bottom: -18px; font-size: 10px; font-weight: 800; background: #15803D; color: #FFFFFF; padding: 1px 6px; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
            ${id} OPTIMAL
          </span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -20],
    });
  }

  // Candidate Warehouse (Neutral Slate)
  return L.divIcon({
    className: 'custom-warehouse-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="width: 28px; height: 28px; border-radius: 8px; background: #57534E; border: 2px solid #FFFFFF; box-shadow: 0 3px 8px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <span style="position: absolute; bottom: -16px; font-size: 9px; font-weight: 700; background: #44403C; color: #E7E2D4; padding: 0px 4px; border-radius: 3px; white-space: nowrap;">
          ${id} Candidate
        </span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// Icon for Demand Zone centers
function createDemandZoneIcon(priority: string, name: string) {
  const color =
    priority === 'High' ? '#DC2626' : priority === 'Medium' ? '#D97706' : '#65A30D';

  return L.divIcon({
    className: 'custom-zone-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 2px solid #FFFFFF; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>
      </div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  });
}

export const LogisticsMap: React.FC<LogisticsMapProps> = ({
  city,
  warehouses,
  zones,
  assignments,
  customPoints,
}) => {
  // Layer Toggles
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showCandidates, setShowCandidates] = useState(true);
  const [showSelected, setShowSelected] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0);

  // Raw coordinate dataset for heatmap
  const rawPoints = customPoints && customPoints.length > 0 ? customPoints : BENGALURU_800_POINTS;

  // Compute heatmap color interpolation
  const getHeatmapColor = (orders: number) => {
    if (orders >= 450) return '#DC2626'; // Red - high demand
    if (orders >= 250) return '#EA580C'; // Orange
    if (orders >= 120) return '#F59E0B'; // Amber - medium demand
    return '#FCD34D'; // Yellow - low demand
  };

  const selectedWarehouses = warehouses.filter((w) => w.isSelected);
  const candidateWarehouses = warehouses.filter((w) => !w.isSelected);

  return (
    <div className="relative w-full h-[600px] lg:h-[650px] rounded-2xl overflow-hidden border border-[#E8E0CE] bg-[#FAF7EF] shadow-xs flex flex-col">
      {/* Map Header / Toolbar */}
      <div className="bg-white/95 backdrop-blur-xs border-b border-[#E8E0CE] px-5 py-3.5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#EA580C] animate-pulse"></div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#1F1A16] tracking-tight font-serif">
              Bengaluru City Demand & Logistics Network
            </h2>
            <p className="text-xs text-[#7A7168]">
              {city.name} BBMP Municipal Footprint • {rawPoints.length} Demand Grid Nodes • {selectedWarehouses.length} Active Hubs
            </p>
          </div>
        </div>

        {/* Map Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Fit Hubs Button */}
          <button
            onClick={() => setFocusTrigger((prev) => prev + 1)}
            title="Auto-fit camera to all active warehouse hubs"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF7EF] hover:bg-[#F5F0E4] border border-[#E7E2D4] rounded-lg text-xs font-semibold text-[#292524] transition-colors cursor-pointer shadow-2xs"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#9E471A]" />
            <span className="hidden sm:inline">Fit Hubs</span>
          </button>

          {/* Leaflet Spatial Engine Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Leaflet Map Engine</span>
          </div>

          {/* Layer Toggle Dropdown */}
          <div className="relative">
            <button
              id="map-layers-toggle-btn"
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FAF7EF] hover:bg-[#F5F0E4] border border-[#E7E2D4] rounded-lg text-xs font-semibold text-[#292524] transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Layers</span>
            </button>

            {isLayerMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#E7E2D4] rounded-xl shadow-lg p-2.5 z-50 text-xs space-y-1.5">
                <div className="font-bold text-[#1C1917] pb-1 border-b border-[#F5F0E4] text-[11px] uppercase tracking-wider">
                  Map Overlays
                </div>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-[#FAF7EF] p-1 rounded">
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-medium text-[#292524]">Demand Heatmap ({rawPoints.length})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-[#FAF7EF] p-1 rounded">
                  <input
                    type="checkbox"
                    checked={showZones}
                    onChange={(e) => setShowZones(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-medium text-[#292524]">Demand Zones ({zones.length})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-[#FAF7EF] p-1 rounded">
                  <input
                    type="checkbox"
                    checked={showSelected}
                    onChange={(e) => setShowSelected(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium text-[#292524]">Selected Hubs ({selectedWarehouses.length})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-[#FAF7EF] p-1 rounded">
                  <input
                    type="checkbox"
                    checked={showCandidates}
                    onChange={(e) => setShowCandidates(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-medium text-[#292524]">Candidate Hubs ({candidateWarehouses.length})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-[#FAF7EF] p-1 rounded">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-medium text-[#292524]">Delivery Routes ({assignments.length})</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leaflet Map Body */}
      <div className="relative flex-1 w-full h-full">
        <MapContainer
          center={city.center}
          zoom={city.zoom}
          scrollWheelZoom={true}
          className="w-full h-full"
          zoomControl={true}
        >
          {/* Controller to update view on city switch and auto-fit hubs */}
          <MapViewController
            center={city.center}
            zoom={city.zoom}
            warehouses={selectedWarehouses}
            resetTrigger={focusTrigger}
          />

          {/* Direct Leaflet Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
            subdomains={['a', 'b', 'c', 'd']}
          />

          {/* A. Demand Heatmap: Grid points from dataset */}
          {showHeatmap &&
            rawPoints.map((pt) => {
              const color = getHeatmapColor(pt.orders);
              return (
                <CircleMarker
                  key={pt.id}
                  center={[pt.lat, pt.lng]}
                  radius={pt.orders > 400 ? 5 : 3.5}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.65,
                    weight: 1,
                    opacity: 0.8,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
                    <div className="text-[11px] font-sans">
                      <div className="font-bold text-[#1C1917]">{pt.id}</div>
                      <div>{pt.orders} orders/day</div>
                      {pt.traffic && <div>Traffic index: {pt.traffic}</div>}
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

          {/* E. Delivery Routes: Drawn from selected warehouse to assigned demand zone */}
          {showRoutes &&
            assignments.map((route) => (
              <Polyline
                key={route.id}
                positions={[route.origin, route.destination]}
                pathOptions={{
                  color: '#15803D',
                  weight: 2.2,
                  dashArray: '6, 6',
                  opacity: 0.75,
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-[#1C1917]">
                      {route.warehouseName} → {route.zoneName}
                    </div>
                    <div className="text-[#78716C]">
                      Distance: <span className="font-semibold text-[#1C1917]">{formatDistance(route.distanceKm)}</span>
                    </div>
                    <div className="text-[#78716C]">
                      Est. Time: <span className="font-semibold text-[#1C1917]">{formatMinutes(route.deliveryTimeMinutes)}</span>
                    </div>
                    <div className="text-[#78716C]">
                      Daily Demand: <span className="font-semibold text-[#1C1917]">{formatNumber(route.demand)} orders</span>
                    </div>
                    <div className="text-[#78716C]">
                      Fuel: <span className="font-semibold text-[#1C1917]">{route.fuelLiters} L</span> (CO₂: {route.co2Kg} kg)
                    </div>
                  </div>
                </Popup>
              </Polyline>
            ))}

          {/* B. Demand Zones */}
          {showZones &&
            zones.map((zone) => (
              <Marker
                key={zone.id}
                position={[zone.lat, zone.lng]}
                icon={createDemandZoneIcon(zone.priority, zone.name)}
              >
                <Popup>
                  <div className="p-1 space-y-2 min-w-[210px] text-xs">
                    <div className="flex items-center justify-between border-b border-[#E7E2D4] pb-1.5">
                      <div>
                        <span className="text-[10px] font-mono text-[#78716C] uppercase">
                          {zone.id}
                        </span>
                        <div className="font-bold text-sm text-[#1C1917] leading-tight">
                          {zone.name}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          zone.priority === 'High'
                            ? 'bg-red-100 text-red-800'
                            : zone.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {zone.priority} Priority
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-1.5 bg-[#FAF7EF] rounded border border-[#E7E2D4]">
                        <div className="text-[#78716C]">Daily Demand</div>
                        <div className="font-bold text-[#1C1917]">
                          {formatNumber(zone.dailyDemand)} orders
                        </div>
                      </div>
                      <div className="p-1.5 bg-[#FAF7EF] rounded border border-[#E7E2D4]">
                        <div className="text-[#78716C]">Peak Volume</div>
                        <div className="font-bold text-[#1C1917]">
                          {formatNumber(zone.peakDemand)}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] space-y-1 text-[#57534E]">
                      <div className="flex justify-between">
                        <span>Assigned Hub:</span>
                        <span className="font-bold text-emerald-800">
                          {zone.assignedWarehouseId || 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Est. Delivery Time:</span>
                        <span className="font-bold text-[#1C1917]">
                          {formatMinutes(zone.deliveryTimeMinutes)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transit Distance:</span>
                        <span className="font-semibold text-[#1C1917]">
                          {formatDistance(zone.distanceKm)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Traffic Congestion:</span>
                        <span className="font-semibold text-amber-700">
                          {(zone.trafficIndex * 10).toFixed(1)} / 10
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* C & D. Warehouses: Candidate (gray) vs Selected (green) */}
          {warehouses.map((wh) => {
            if (wh.isSelected && !showSelected) return null;
            if (!wh.isSelected && !showCandidates) return null;

            const isOffline = wh.status === 'Offline';
            return (
              <Marker
                key={wh.id}
                position={[wh.lat, wh.lng]}
                icon={createWarehouseIcon(wh.isSelected, isOffline, wh.id)}
                zIndexOffset={wh.isSelected ? 1000 : 500}
              >
                <Popup>
                  <div className="p-1 space-y-2.5 min-w-[240px] text-xs">
                    <div className="border-b border-[#E7E2D4] pb-1.5 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-[#1C1917]">
                            {wh.id} • {wh.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#78716C] mt-0.5">{wh.location}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          wh.isSelected
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isOffline
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-stone-100 text-stone-700 border border-stone-300'
                        }`}
                      >
                        {wh.isSelected ? 'Selected' : isOffline ? 'Offline' : 'Candidate'}
                      </span>
                    </div>

                    {/* Capacity & Utilization Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#78716C]">Capacity Utilization:</span>
                        <span className="font-bold text-[#1C1917]">{wh.utilization}%</span>
                      </div>
                      <div className="w-full bg-[#E7E2D4] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            wh.utilization > 85
                              ? 'bg-amber-600'
                              : wh.utilization > 0
                              ? 'bg-emerald-600'
                              : 'bg-stone-400'
                          }`}
                          style={{ width: `${wh.utilization}%` }}
                        />
                      </div>
                    </div>

                    {/* Warehouse Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 bg-[#FAF7EF] rounded-lg border border-[#E7E2D4]">
                        <div className="text-[#78716C]">Daily Demand Served</div>
                        <div className="font-extrabold text-sm text-[#1C1917] mt-0.5">
                          {formatNumber(wh.demandServed)}
                        </div>
                        <div className="text-[10px] text-[#A8A29E]">of {formatNumber(wh.capacity)} cap</div>
                      </div>
                      <div className="p-2 bg-[#FAF7EF] rounded-lg border border-[#E7E2D4]">
                        <div className="text-[#78716C]">Operating Cost</div>
                        <div className="font-extrabold text-sm text-[#1C1917] mt-0.5">
                          {formatINR(wh.operatingCost / 100000)}
                        </div>
                        <div className="text-[10px] text-[#A8A29E]">daily lease/fixed</div>
                      </div>
                    </div>

                    {/* Assigned Zones List */}
                    <div className="text-[11px] space-y-1">
                      <div className="font-semibold text-[#1C1917]">
                        Assigned Zones ({wh.assignedZones.length}):
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {wh.assignedZones.length > 0 ? (
                          wh.assignedZones.map((zName) => (
                            <span
                              key={zName}
                              className="px-1.5 py-0.5 bg-[#F5F0E4] text-[#44403C] rounded text-[10px] font-medium"
                            >
                              {zName}
                            </span>
                          ))
                        ) : (
                          <span className="text-stone-400 italic">No zones assigned (idle)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Map Legend (Top Left Overlay matching screenshot) */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs border border-[#E8E0CE] rounded-xl p-3 shadow-md z-[1000] text-xs max-w-xs pointer-events-auto">
          <div className="font-bold text-[#1F1A16] mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider">
            <span>Map Legend</span>
            <span className="text-[10px] text-[#8C592C] font-mono font-bold">Namma Warehouse</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
              <span className="text-[#5C544C]">High Demand</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
              <span className="text-[#5C544C]">Medium Demand</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]"></span>
              <span className="text-[#5C544C]">Low Demand</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 border border-white flex items-center justify-center text-white text-[8px]">
                <WarehouseIcon className="w-2.5 h-2.5" />
              </span>
              <span className="text-[#1F1A16] font-medium">Selected Warehouse</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-[#57534E] border border-white flex items-center justify-center text-white text-[8px]">
                <WarehouseIcon className="w-2.5 h-2.5" />
              </span>
              <span className="text-[#5C544C]">Candidate Warehouse</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-emerald-600"></span>
              <span className="text-[#5C544C]">Delivery Route</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-t border-dashed border-[#A8A29E]"></span>
              <span className="text-[#5C544C]">Zone Boundary</span>
            </div>
          </div>
        </div>

        {/* Floating Warehouse Callout Card (Bottom Left) */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-xs border border-[#E8E0CE] rounded-xl p-3 shadow-md z-[1000] text-xs pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-emerald-800 text-xs">W2 (Selected)</span>
          </div>
          <p className="text-[11px] text-[#5C544C] mt-0.5 font-medium">
            Serves 8 zones • 82% capacity
          </p>
        </div>
      </div>

    </div>
  );
};
