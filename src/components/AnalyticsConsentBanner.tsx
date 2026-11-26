import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAnalyticsConsent,
  getAnalyticsMeasurementId,
  setAnalyticsConsent,
} from '../lib/analytics';

export function AnalyticsConsentBanner() {
  const measurementId = getAnalyticsMeasurementId();
  const [visible, setVisible] = useState(
    () => Boolean(measurementId) && getAnalyticsConsent() === 'pending'
  );

  if (!visible) return null;

  const handleChoice = (choice: 'granted' | 'denied') => {
    setAnalyticsConsent(choice);
    setVisible(false);
  };

  return (
    <aside
      aria-label="Analytics consent"
      className="fixed bottom-3 right-3 left-3 sm:left-auto sm:max-w-md z-40 bg-white border border-[#E7E2D8] rounded-xl p-4 shadow-md"
    >
      <p className="text-xs text-[#1C1917] leading-relaxed mb-3">
        WedSnap uses privacy-conscious aggregate analytics to understand gallery performance. Face scans and wedding photos are never tracked.{' '}
        <Link to="/privacy-policy" className="underline underline-offset-2 text-[#9A742D]">
          Learn more
        </Link>
        .
      </p>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => handleChoice('denied')}
          className="px-3 py-1.5 text-xs font-medium text-[#57534E] border border-[#D6D3CD] rounded-lg hover:bg-[#F3F0EA] whitespace-nowrap"
        >
          Essential Only
        </button>
        <button
          type="button"
          onClick={() => handleChoice('granted')}
          className="px-3 py-1.5 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] whitespace-nowrap"
        >
          Accept Analytics
        </button>
      </div>
    </aside>
  );
}
