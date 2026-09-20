import React, { useState, useMemo, useRef } from 'react';
import { Database, Search, Layers, UploadCloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { BENGALURU_800_POINTS } from '../data/rawBengaluruPoints';
import { api } from '../services/api';

export const DataPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [customPoints, setCustomPoints] = useState<any[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageSize = 25;

  const activePoints = customPoints || BENGALURU_800_POINTS;

  const zones = useMemo(() => {
    const set = new Set<string>();
    activePoints.forEach((p) => {
      if (p.zoneName) set.add(p.zoneName);
    });
    return Array.from(set).sort();
  }, [activePoints]);

  const filteredPoints = useMemo(() => {
    return activePoints.filter((p) => {
      const matchSearch =
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        (p.zoneName && p.zoneName.toLowerCase().includes(search.toLowerCase()));
      const matchZone = zoneFilter === 'ALL' || p.zoneName === zoneFilter;
      return matchSearch && matchZone;
    });
  }, [activePoints, search, zoneFilter]);

  const totalPages = Math.ceil(filteredPoints.length / pageSize) || 1;
  const currentPoints = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPoints.slice(start, start + pageSize);
  }, [filteredPoints, page]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setIsUploading(false);
        return;
      }
      try {
        const res = await api.uploadPoints(text);
        if (res.status === 'ok' && res.points) {
          const mapped = res.points.map((p: any) => ({
            id: p.point_id,
            lat: p.latitude,
            lng: p.longitude,
            orders: p.orders_per_day,
            price: p.price_per_sqft,
            sqft: p.price_per_sqft,
            traffic: p.traffic_index,
            zoneName: p.zone || 'Custom',
          }));
          setCustomPoints(mapped);
          setUploadMessage(`Successfully loaded ${mapped.length} custom points!`);
          setPage(1);
        } else {
          setUploadMessage(res.message || 'Error parsing CSV file');
        }
      } catch (err: any) {
        setUploadMessage('Upload failed: ' + (err.message || 'Unknown error'));
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleResetPoints = () => {
    setCustomPoints(null);
    api.setCustomPoints(null);
    setUploadMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalDailyOrders = useMemo(() => {
    return activePoints.reduce((sum, p) => sum + (p.orders || 0), 0);
  }, [activePoints]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-[#E8DFC9] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#FFF8EE] border border-[#E9CDB0] text-[#9E471A]">
              <Database size={20} />
            </span>
            <h2 className="text-xl font-bold text-[#261B14] font-['Space_Grotesk']">
              {customPoints ? 'Custom Spatial Grid Dataset' : 'BBMP 800 Discrete Spatial Grid Dataset'}
            </h2>
          </div>
          <p className="text-xs text-[#7A7168] mt-1">
            {customPoints
              ? `Active custom neighborhood points (${customPoints.length} locations) fed directly to the optimization solver.`
              : 'Real Bengaluru Municipal Corporation (BBMP) ward polygons dissolved into 800 jittered candidate facility nodes.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#9E471A] text-white hover:bg-[#873c15] text-xs font-semibold shadow-sm transition-colors"
          >
            <UploadCloud size={14} className={isUploading ? 'animate-bounce' : ''} />
            {isUploading ? 'Uploading...' : 'Upload CSV'}
          </button>

          {customPoints && (
            <button
              onClick={handleResetPoints}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8DFC9] text-[#9E471A] hover:bg-[#FAF7EF] text-xs font-semibold transition-colors"
            >
              <RefreshCw size={13} />
              Reset to BBMP 800
            </button>
          )}

          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#FFF8EE] text-[#9E471A] border border-[#E9CDB0]">
            {activePoints.length} Points • {(totalDailyOrders / 1000000).toFixed(2)}M Orders/Day
          </span>
        </div>
      </div>

      {uploadMessage && (
        <div className="bg-[#FFF8EE] border border-[#E9CDB0] rounded-xl p-3 flex items-center gap-2 text-xs text-[#9E471A]">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E8DFC9] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A7168]" />
          <input
            type="text"
            placeholder="Search point ID or zone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E8DFC9] text-xs outline-none focus:border-[#EA580C] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Layers size={14} className="text-[#7A7168]" />
          <select
            value={zoneFilter}
            onChange={(e) => {
              setZoneFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-[#E8DFC9] text-xs outline-none font-semibold text-[#261B14] bg-[#FAF7EF]"
          >
            <option value="ALL">All Zones ({BENGALURU_800_POINTS.length})</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z} Zone
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-[#E8DFC9] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7EF] border-b border-[#E8DFC9] text-[#7A7168] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Node ID</th>
                <th className="py-3 px-4">Zone Name</th>
                <th className="py-3 px-4">Coordinates (Lat, Lng)</th>
                <th className="py-3 px-4 text-right">Daily Orders</th>
                <th className="py-3 px-4 text-right">Rent/Sq.Ft</th>
                <th className="py-3 px-4 text-right">Traffic Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF5E8]">
              {currentPoints.map((pt) => {
                const tr = pt.traffic ?? 0.5;
                return (
                  <tr key={pt.id} className="hover:bg-[#FFF8EE]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#9E471A]">{pt.id}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#FAF7EF] border border-[#E8DFC9] text-[10px] font-semibold text-[#7A7168]">
                        {pt.zoneName || 'Bengaluru Urban'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500">
                      {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#261B14]">
                      {Math.round(pt.orders).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#9E471A]">
                      ₹{(pt.price ?? 45).toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tr >= 0.75
                            ? 'bg-red-50 text-red-700'
                            : tr >= 0.5
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {tr.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-[#FAF7EF] border-t border-[#E8DFC9] flex items-center justify-between text-xs">
          <div className="text-[#7A7168]">
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, filteredPoints.length)} of {filteredPoints.length} nodes
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-[#E8DFC9] bg-white disabled:opacity-40 font-semibold text-[#261B14]"
            >
              Previous
            </button>
            <span className="text-[#7A7168] font-mono">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-[#E8DFC9] bg-white disabled:opacity-40 font-semibold text-[#261B14]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
