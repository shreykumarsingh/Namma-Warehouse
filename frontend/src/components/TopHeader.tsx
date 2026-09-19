import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api, BackendStatus } from '../services/api';
import {
  Bell,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Warehouse,
  Share2,
  Heart,
  ChevronDown,
  LayoutDashboard,
  GitFork,
  BarChart3,
  Database,
  Settings,
  Check,
  ArrowRight,
} from 'lucide-react';
import { UserNotification } from '../types';

export type TabType = 'dashboard' | 'scenarios' | 'analytics' | 'data' | 'settings';

export interface FeatureItem {
  id: TabType;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const FEATURES: FeatureItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortDesc: 'Live spatial simulation & hub mapping',
    icon: LayoutDashboard,
  },
  {
    id: 'scenarios',
    label: 'Scenarios',
    shortDesc: 'Congestion & multi-hub SLA simulation',
    icon: GitFork,
    badge: 'Sim',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    shortDesc: 'SLA, emissions & cost benchmarks',
    icon: BarChart3,
  },
  {
    id: 'data',
    label: 'Data',
    shortDesc: 'BBMP grid density & demand coordinates',
    icon: Database,
  },
  {
    id: 'settings',
    label: 'Settings',
    shortDesc: 'Network parameters & penalty weights',
    icon: Settings,
  },
];

interface TopHeaderProps {
  onOpenDemoTour: () => void;
  onOpenFeatures?: () => void;
  onEnquire?: () => void;
  userName?: string;
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenDemoTour,
  onOpenFeatures,
  onEnquire,
  userName = 'Arjun',
  activeTab = 'dashboard',
  setActiveTab,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [truckHonked, setTruckHonked] = useState(false);
  const [isFeaturesHovered, setIsFeaturesHovered] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(() => api.getBackendStatus());
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = api.onStatusChange((s) => setBackendStatus(s));
    api.checkBackendHealth();
    return () => unsub();
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsFeaturesHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsFeaturesHovered(false);
    }, 180);
  };

  const activeFeature = FEATURES.find((f) => f.id === activeTab) || FEATURES[0];

  const handleTruckHonk = () => {
    setTruckHonked(true);
    setTimeout(() => setTruckHonked(false), 2000);
  };
  const [notifications, setNotifications] = useState<UserNotification[]>([
    {
      id: '1',
      time: '10m ago',
      title: 'Optimal Configuration Ready',
      detail: '3 candidate hubs selected with 94.2% SLA compliance in Bengaluru.',
      read: false,
      type: 'success',
    },
    {
      id: '2',
      time: '1h ago',
      title: 'Peak Traffic Alert',
      detail: 'Outer Ring Road traffic index reached 0.92 during peak morning hours.',
      read: false,
      type: 'warning',
    },
    {
      id: '3',
      time: '2h ago',
      title: 'BBMP Spatial Data Synced',
      detail: '800 coordinate grid nodes updated with Census density weighting.',
      read: true,
      type: 'info',
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="bg-white border-b border-[#EADFCB] sticky top-0 z-40 shadow-xs">
      {/* Top Line: Keep Title differently */}
      <div className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 max-w-[1700px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
            {/* Warehouse Icon in rounded square box with warm outline */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FFF8EE] border border-[#E7D6BE] flex items-center justify-center text-[#9E471A] shadow-2xs shrink-0">
              <svg
                className="w-5.5 h-5.5 sm:w-6 sm:h-6 stroke-[1.8] text-[#9E471A]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Classical storage warehouse pediment & pillars */}
                <path d="M3 10L12 3L21 10V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10Z" />
                <path d="M9 21V14H15V21" />
                <path d="M7 10H17" />
                <path d="M12 7V8" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                {/* Namma Warehouse with Cormorant Garamond font by Christian Thalmann */}
                <span
                  className="font-bold text-2xl sm:text-[26px] md:text-[28px] text-[#261B14] tracking-tight leading-none select-none"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Namma Warehouse
                </span>

                {/* Cute Animated Delivery Truck beside Namma Warehouse */}
                <div
                  onClick={handleTruckHonk}
                  className="relative inline-flex items-center cursor-pointer select-none group py-0.5"
                  title="Cute Namma delivery truck • Click for beep beep!"
                >
                  {/* Little Honk Speech Bubble */}
                  {truckHonked && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.8 }}
                      animate={{ opacity: 1, y: -24, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-white text-[#9E471A] text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md border border-amber-300 flex items-center gap-1"
                    >
                      <span>Beep beep!</span>
                      <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500 inline" />
                    </motion.div>
                  )}

                  {/* Truck with playful suspension bounce & forward roll */}
                  <motion.div
                    animate={{
                      y: [0, -2, 0, -1.5, 0],
                      x: [0, 2, 0, -1, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="relative flex items-center"
                  >
                    {/* Glowing warm headlight beam casting forward onto road */}
                    <div className="absolute left-[36px] top-[12px] w-7 h-3 bg-gradient-to-r from-amber-300/80 via-amber-200/40 to-transparent rounded-r-full pointer-events-none blur-[0.5px]" />

                    {/* Little Eco Sprout on Roof waving in wind */}
                    <motion.div
                      animate={{ rotate: [-8, 8, -8] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute top-[-5px] left-[13px] z-10 select-none text-[10px] leading-none"
                    >
                      🌱
                    </motion.div>

                    {/* Cute Chubby Delivery Van SVG */}
                    <svg
                      width="44"
                      height="27"
                      viewBox="0 0 46 29"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform group-hover:scale-105"
                    >
                      {/* Shadow under truck */}
                      <ellipse cx="23" cy="27" rx="19" ry="2" fill="#1C1917" opacity="0.2" />

                      {/* Main Cargo Box (Sunny Amber) with rounded corners */}
                      <rect x="2" y="6" width="25" height="17" rx="3.5" fill="#F59E0B" />
                      {/* Cargo Roof Highlight */}
                      <rect x="2" y="6" width="25" height="3.5" rx="1.5" fill="#FBBF24" />

                      {/* Cute White Delivery Parcel Graphic on Cargo side */}
                      <rect
                        x="8"
                        y="10.5"
                        width="13"
                        height="8"
                        rx="1.5"
                        fill="#FEF3C7"
                        stroke="#D97706"
                        strokeWidth="0.75"
                      />
                      {/* Parcel ribbon tape */}
                      <line x1="14.5" y1="10.5" x2="14.5" y2="18.5" stroke="#EA580C" strokeWidth="0.9" />
                      <line x1="8" y1="14.5" x2="21" y2="14.5" stroke="#EA580C" strokeWidth="0.9" />
                      <circle cx="14.5" cy="14.5" r="1" fill="#B45309" />

                      {/* Front Cab (Chubby Curved Nose in Warm Marigold) */}
                      <path
                        d="M26 8.5C26 7.5 27 6.5 28 6.5H34C37.5 6.5 41 9 42 13L43.2 18C43.7 19.8 42.2 21.5 40 21.5H26V8.5Z"
                        fill="#FBBF24"
                      />

                      {/* Cute Rounded Windshield */}
                      <path
                        d="M28 8H33.5C35.8 8 38 9.5 38.8 12L39.5 14.5H28V8Z"
                        fill="#BAE6FD"
                      />
                      {/* Windshield Shine / Glint */}
                      <line
                        x1="31"
                        y1="9"
                        x2="36"
                        y2="13.5"
                        stroke="#FFFFFF"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        opacity="0.85"
                      />

                      {/* Front Bumper */}
                      <rect
                        x="41.5"
                        y="19.5"
                        width="3.5"
                        height="3"
                        rx="1.5"
                        fill="#E2E8F0"
                        stroke="#94A3B8"
                        strokeWidth="0.5"
                      />

                      {/* Round Cheerful Headlight */}
                      <circle cx="41.5" cy="15.5" r="2.2" fill="#FEF08A" stroke="#F59E0B" strokeWidth="0.75" />
                      <circle cx="41.5" cy="15.5" r="1" fill="#FFFFFF" />

                      {/* Tail Light */}
                      <rect x="1" y="12.5" width="1.5" height="3" rx="0.75" fill="#EF4444" />

                      {/* Rear Wheel */}
                      <g>
                        <circle cx="10" cy="23.5" r="4.5" fill="#292524" />
                        <circle cx="10" cy="23.5" r="2.4" fill="#F8FAFC" />
                        <circle cx="10" cy="23.5" r="1" fill="#F59E0B" />
                      </g>

                      {/* Front Wheel */}
                      <g>
                        <circle cx="34" cy="23.5" r="4.5" fill="#292524" />
                        <circle cx="34" cy="23.5" r="2.4" fill="#F8FAFC" />
                        <circle cx="34" cy="23.5" r="1" fill="#F59E0B" />
                      </g>
                    </svg>

                    {/* Animated tiny exhaust puffs */}
                    <motion.div
                      animate={{
                        opacity: [0, 0.7, 0],
                        x: [0, -8],
                        y: [0, -2],
                        scale: [0.5, 1.2, 0.3],
                      }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        ease: 'easeOut',
                      }}
                      className="absolute left-[-4px] bottom-[3px] w-1.5 h-1.5 rounded-full bg-stone-300/80 pointer-events-none"
                    />
                  </motion.div>
                </div>

                {/* Bengaluru Central Pill Badge with orange dot */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF8EE] text-[#9E471A] border border-[#E9CDB0]">
                  <span className="w-2 h-2 rounded-full bg-[#EA580C]"></span>
                  <span>Bengaluru Central</span>
                </span>
              </div>

              {/* Subtitle: Premium Storage & 3PL Logistics Operations */}
              <p className="text-[11.5px] sm:text-xs text-[#7A7168] mt-0.5 font-normal tracking-normal leading-tight">
                Premium Storage & 3PL Logistics Operations
              </p>
            </div>
          </div>
        </div>

      {/* SEPARATE LINE: Highlighted separately with Features, Interactive Tour, Ring, and Profile */}
      <div className="bg-[#FAF5E8] border-t border-[#E8DFC9] px-4 sm:px-6 md:px-8 py-1.5 sm:py-2">
        <div className="flex items-center justify-between gap-4 max-w-[1700px] mx-auto">
          {/* Features Navigation (Hovering over icon reveals options, NO dropdown arrow!) */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Feature trigger with title only - NO dropdown arrow */}
            <div
              onClick={() => setIsFeaturesHovered(!isFeaturesHovered)}
              className="inline-flex items-center gap-2 py-1 px-2.5 rounded-lg bg-white hover:bg-[#FFF8EE] border border-[#E2D4BF] hover:border-[#D0BDA0] cursor-pointer transition-all duration-200 shadow-2xs group select-none"
              title="Hover icon to explore features"
            >
              {/* 4-Square Bento Launcher Icon */}
              <div className="w-5 h-5 rounded bg-[#332219] group-hover:bg-[#9E471A] flex items-center justify-center text-[#FAF5E8] shadow-xs shrink-0 group-hover:scale-105 transition-all duration-200">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-[#FAF5E8]"
                >
                  <rect x="2.5" y="2.5" width="6" height="6" rx="1.8" stroke="currentColor" strokeWidth="2.2" />
                  <rect x="11.5" y="2.5" width="6" height="6" rx="1.8" stroke="currentColor" strokeWidth="2.2" />
                  <rect x="2.5" y="11.5" width="6" height="6" rx="1.8" stroke="currentColor" strokeWidth="2.2" />
                  <rect x="11.5" y="11.5" width="6" height="6" rx="1.8" stroke="currentColor" strokeWidth="2.2" />
                </svg>
              </div>

              {/* Title for Feature - Just a title, NO dropdown arrow */}
              <span className="text-xs font-bold text-[#261B14] tracking-tight">
                Features
              </span>

              {/* Active Feature Badge */}
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#9E471A] bg-[#FFF8EE] px-2 py-0.5 rounded-md border border-[#E7DCBA]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]"></span>
                <span>{activeFeature.label}</span>
              </span>
            </div>

              {/* Seamless hover bridge */}
              <div className="h-1.5 w-full" />

              {/* Floating Features Menu (Displays while cursoring over it) */}
              <AnimatePresence>
                {isFeaturesHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute left-0 top-full pt-0.5 z-50 w-72 sm:w-84"
                  >
                    <div className="bg-white rounded-2xl shadow-2xl border border-[#E2D6C1] overflow-hidden">
                      {/* Header */}
                      <div className="px-3.5 py-2.5 bg-[#FAF5E8] border-b border-[#E8DFC9] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#332219] flex items-center justify-center text-[#FAF5E8]">
                            <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
                              <rect x="2.5" y="2.5" width="6" height="6" rx="1.8" stroke="currentColor" strokeWidth="2.2" />
                              <rect x="11.5" y="2.5" width="6" height="6" rx="1.8" stroke="currentColor" strokeWidth="2.2" />
                              <rect x="2.5" y="11.5" width="6" height="6" rx="1.8" stroke="currentColor" strokeWidth="2.2" />
                              <rect x="11.5" y="11.5" width="6" height="6" rx="1.8" stroke="currentColor" strokeWidth="2.2" />
                            </svg>
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E471A]">
                            Select Feature
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-[#7A7168] bg-[#FFF8EE] px-2 py-0.5 rounded-full border border-[#E8DFC9]">
                          5 Modules
                        </span>
                      </div>

                      {/* 5 Features List */}
                      <div className="p-1.5 space-y-1">
                        {FEATURES.map((feature) => {
                          const Icon = feature.icon;
                          const isSelected = activeTab === feature.id;

                          return (
                            <button
                              key={feature.id}
                              onClick={() => {
                                setActiveTab?.(feature.id);
                                setIsFeaturesHovered(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#FFF8EE] text-[#9E471A] border border-[#E9CDB0] shadow-2xs font-semibold'
                                  : 'hover:bg-[#FAF7EF] text-[#261B14] border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                    isSelected
                                      ? 'bg-[#FAF3E3] border-[#E9CDB0] text-[#9E471A]'
                                      : 'bg-[#FAF5E8] border-[#E8DFC9] text-[#7A7168]'
                                  }`}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs sm:text-sm font-bold text-[#1F1A16] truncate">
                                      {feature.label}
                                    </span>
                                    {feature.badge && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#FAF3E3] text-[#9E471A] border border-[#E9CDB0]">
                                        {feature.badge}
                                      </span>
                                    )}
                                    {isSelected && (
                                      <span className="text-[9px] font-bold bg-[#9E471A] text-white px-1.5 py-0.2 rounded-full">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[#7A7168] truncate">
                                    {feature.shortDesc}
                                  </p>
                                </div>
                              </div>
                              {isSelected ? (
                                <Check className="w-4 h-4 text-[#9E471A] shrink-0 ml-2" />
                              ) : (
                                <ArrowRight className="w-3.5 h-3.5 text-[#9E471A] opacity-0 group-hover:opacity-100 shrink-0 ml-2 transition-opacity" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right side: Backend Badge, Tour button, Notification Bell, BLR Avatar badge */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Backend Status Indicator */}
              <button
                onClick={() => api.checkBackendHealth()}
                title={
                  backendStatus.online
                    ? 'FastAPI Spatial Optimization Backend is ONLINE (Click to re-check)'
                    : 'FastAPI Backend is offline (Click to retry connection)'
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                  backendStatus.online
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-[#FAF5E8] hover:bg-stone-100 text-stone-600 border-[#E8DFC9]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    backendStatus.online
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-stone-400'
                  }`}
                />
                <span className="hidden sm:inline">
                  {backendStatus.online ? 'FastAPI: Online' : 'Backend: Offline'}
                </span>
                <span className="sm:hidden">
                  {backendStatus.online ? 'Online' : 'Offline'}
                </span>
              </button>

              {/* Quick Demo Tour */}
              <button
                onClick={onOpenDemoTour}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#FFF8EE] text-[#4A321E] text-xs font-semibold border border-[#E5D7BF] hover:border-[#D0BDA0] transition-colors shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Interactive Tour</span>
              </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-9 h-9 rounded-xl bg-white border border-[#E2D6C1] hover:border-amber-500 text-[#5C5248] hover:text-[#261B14] flex items-center justify-center transition-colors relative shadow-2xs"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EA580C] rounded-full ring-2 ring-white"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E2D6C1] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3.5 bg-[#FAF5E8] border-b border-[#E8E0CE] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#9E471A]" />
                    <span className="text-xs font-bold text-[#261B14]">Namma Alerts</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-[#9E471A] hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="divide-y divide-[#F5EFE0] max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition-colors ${
                        n.read ? 'bg-white' : 'bg-amber-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {n.type === 'success' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        )}
                        {n.type === 'warning' && (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        {n.type === 'info' && (
                          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#1F1A16]">{n.title}</span>
                            <span className="text-[10px] text-[#A8A29E]">{n.time}</span>
                          </div>
                          <p className="text-[#5C544C] text-[11px] mt-0.5 leading-relaxed">
                            {n.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 text-center bg-[#FAF5E8] border-t border-[#E8E0CE]">
                  <span className="text-[11px] text-[#7A7168]">
                    BBMP 800 grid nodes synchronized
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Round BLR Badge matching user screenshot */}
          <div
            className="w-9 h-9 rounded-full bg-[#9E471A] text-white flex items-center justify-center font-bold text-xs shadow-2xs tracking-wider cursor-pointer hover:bg-[#863B13] transition-colors"
            title="Bengaluru Logistics Region"
          >
            BLR
          </div>
        </div>
      </div>
    </div>
  </header>
  );
};
