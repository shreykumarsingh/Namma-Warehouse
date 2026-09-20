import React, { useState } from 'react';
import { Sparkles, Eye, Phone, Share2, Check } from 'lucide-react';

interface HeroBannerProps {
  activeHubsCount?: number;
  onOpenEnquiry: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  activeHubsCount = 3,
  onOpenEnquiry,
}) => {
  const [showToast, setShowToast] = useState(false);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  return (
    <div className="hero-wrap">
      <div className="hero-card" id="hero-card">
        <div className="hero-bg" />
        <div className="hero-overlay" />
        <div className="hero-glow" />

        {/* Top Badges */}
        <div className="hero-top">
          <span className="pill pill-dark">
            <span className="pulse-dot pulse-orange" />
            Namma Storage • Bengaluru Central Hub
          </span>
          <span className="pill pill-teal">
            <Sparkles size={12} />
            Grade-A Smart Facility
          </span>
        </div>

        {/* Middle Content */}
        <div className="hero-mid">
          <div className="hero-sub-badges">
            <span className="badge-orange">ISO CERTIFIED FACILITIES</span>
            <span className="badge-dark">100% CCTV &amp; Fire Compliant</span>
          </div>
          <h1 className="hero-h1">Taking Care of Your Storage &amp; Logistics Needs</h1>
          <p className="hero-p">
            Ultra-modern, temperature-regulated micro-warehouses and strategic fulfillment centers
            deployed across Bengaluru to conquer peak Outer Ring Road congestion and optimize last-mile SLAs.
          </p>
          <div style={{ paddingTop: '.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <span className="pill pill-eye">
              <Eye size={12} color="#FBBF24" />
              High-Bay Automated Racking - 24/7 Security
            </span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="hero-bot">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
            <span className="pill pill-emerald">
              <span className="pulse-dot pulse-green" />
              {activeHubsCount} Bengaluru Micro-Hubs Active
            </span>
            <span className="pill pill-dark">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Zero-Loss Guarantee
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <button className="hero-enquire" onClick={onOpenEnquiry}>
              <Phone size={14} fill="currentColor" />
              Enquire Now
            </button>
            <button className="hero-share" onClick={handleShare} title="Share">
              <Share2 size={14} />
            </button>
          </div>
        </div>

        {/* Share Toast */}
        {showToast && (
          <div className="share-toast" id="share-toast">
            <Check size={12} strokeWidth={2.5} color="#34D399" />
            Link copied to clipboard!
          </div>
        )}
      </div>
    </div>
  );
};
