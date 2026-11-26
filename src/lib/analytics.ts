// Privacy-first Google Analytics 4 integration (aggregate non-PII events only)

export type WedSnapAnalyticsEvent =
  | 'page_view'
  | 'event_page_view'
  | 'guest_scan_started'
  | 'guest_scan_completed'
  | 'matching_results_found'
  | 'photo_downloaded'
  | 'qr_code_downloaded'
  | 'organizer_signup'
  | 'event_created'
  | 'contact_form_submitted';

type ConsentChoice = 'pending' | 'granted' | 'denied';

let analyticsConsent: ConsentChoice = 'pending';
let gaInitialized = false;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function getAnalyticsMeasurementId(): string {
  return (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
}

export function getAnalyticsConsent(): ConsentChoice {
  return analyticsConsent;
}

export function setAnalyticsConsent(choice: 'granted' | 'denied'): void {
  analyticsConsent = choice;
  if (choice === 'granted') {
    initGoogleAnalytics();
  }
}

export function initGoogleAnalytics(): void {
  const measurementId = getAnalyticsMeasurementId();
  if (!measurementId || analyticsConsent !== 'granted' || gaInitialized || typeof document === 'undefined') {
    return;
  }

  gaInitialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    anonymize_ip: true,
    send_page_view: false,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

// Track strictly aggregate event counters (never send biometric vectors, photos, PII, or private tokens)
export function trackAnalyticsEvent(
  eventName: WedSnapAnalyticsEvent,
  params?: Record<string, string | number | boolean>
): void {
  if (analyticsConsent !== 'granted' || typeof window === 'undefined' || !window.gtag) {
    return;
  }
  window.gtag('event', eventName, params ?? {});
}
