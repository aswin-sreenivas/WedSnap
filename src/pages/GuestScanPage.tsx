import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import { trackAnalyticsEvent } from '../lib/analytics';
import { getEventBySlug } from '../lib/eventsService';
import { ensureFaceModelsLoaded, extractGuestSelfieEmbedding } from '../lib/faceEngine';
import { WeddingEvent } from '../types/wedsnap';

export function GuestScanPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [event, setEvent] = useState<WeddingEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [consentGiven, setConsentGiven] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [processingScan, setProcessingScan] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!slug) {
      setLoadingEvent(false);
      return;
    }
    let active = true;
    getEventBySlug(slug)
      .then((evt) => {
        if (active) setEvent(evt);
      })
      .finally(() => {
        if (active) setLoadingEvent(false);
      });

    ensureFaceModelsLoaded()
      .then(() => {
        if (active) setModelsReady(true);
      })
      .catch(() => {
        if (active) setErrorMsg('AI face recognition models failed to load. Please refresh.');
      });

    return () => {
      active = false;
      stopCameraStream();
    };
  }, [slug]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setErrorMsg('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Camera access is not supported in this browser. Please upload a selfie photo below instead.');
      return;
    }

    setCameraStarting(true);
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      trackAnalyticsEvent('guest_scan_started', { method: 'camera' });
    } catch {
      setErrorMsg(
        'Camera permission was denied or unavailable. You can grant camera access or upload a clear photo of yourself below.'
      );
    } finally {
      setCameraStarting(false);
    }
  };

  const handleCaptureCamera = async () => {
    if (!videoRef.current || !event) return;
    setErrorMsg('');
    setProcessingScan(true);

    const canvas = document.createElement('canvas');
    try {
      const video = videoRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to capture frame from camera.');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const { embedding } = await extractGuestSelfieEmbedding(canvas);
      // Immediately clear captured frame & stop camera stream
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stopCameraStream();
      trackAnalyticsEvent('guest_scan_completed', { method: 'camera' });

      navigate(`/e/${event.slug}/results`, {
        state: {
          ephemeralEmbedding: embedding,
          scannedAt: Date.now(),
        },
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not detect a face in that capture.');
    } finally {
      setProcessingScan(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;
    setErrorMsg('');
    setProcessingScan(true);
    trackAnalyticsEvent('guest_scan_started', { method: 'upload' });

    const objectUrl = URL.createObjectURL(file);
    try {
      const { embedding } = await extractGuestSelfieEmbedding(objectUrl);
      stopCameraStream();
      trackAnalyticsEvent('guest_scan_completed', { method: 'upload' });
      navigate(`/e/${event.slug}/results`, {
        state: {
          ephemeralEmbedding: embedding,
          scannedAt: Date.now(),
        },
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to detect a clear face in the uploaded photo.'
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
      e.target.value = '';
      setProcessingScan(false);
    }
  };

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-6">
        <div className="w-9 h-9 border-2 border-[#9A742D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-[#E7E2D8] rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-semibold text-[#1C1917] mb-2">Wedding gallery not found</h1>
          <p className="text-sm text-[#57534E] mb-6">
            Please return to the event link shared by your wedding host.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] text-white text-sm font-medium rounded-lg"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title="Scan Your Face | WedSnap"
        description="Private ephemeral face scan to find your wedding photographs on WedSnap."
        path={`/e/${event.slug}/scan`}
        robots="noindex, nofollow"
      />
      <header className="border-b border-[#E7E2D8] bg-white">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link
            to={`/e/${event.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#57534E] hover:text-[#1C1917] whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {event.title}</span>
          </Link>
          <span className="font-display text-xl font-semibold text-[#1C1917]">WedSnap</span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-[#9A742D] mb-2">
            Guest Face Scan
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[#1C1917] mb-2">
            Find your photos from {event.coupleNames}
          </h1>
          <p className="text-sm text-[#57534E]">
            Look directly at the camera in even lighting, or upload a clear front-facing portrait.
          </p>
        </div>

        {/* Ephemeral Biometric Consent Box */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6">
          <div className="flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-[#9A742D] shrink-0 mt-0.5" />
            <div className="space-y-3 flex-1">
              <div>
                <h2 className="font-sans text-sm font-semibold text-[#1C1917] mb-1">
                  Privacy &amp; Ephemeral Face Recognition Consent
                </h2>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  With your permission, WedSnap generates a temporary mathematical face signature in your browser to compare against indexed photographs from this wedding. Your camera frame and facial data are never saved to any database and are discarded immediately once your matching photos are shown.
                </p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => {
                    setConsentGiven(e.target.checked);
                    if (!e.target.checked) stopCameraStream();
                  }}
                  className="w-4 h-4 rounded border-[#D6D3CD] accent-[#9A742D]"
                />
                <span className="text-sm font-medium text-[#1C1917]">
                  I consent to ephemeral face matching to find my wedding photographs
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Camera Viewfinder + Guide */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 space-y-5">
          <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#1C1917] flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover -scale-x-100 ${cameraActive ? 'block' : 'hidden'}`}
            />

            {/* Circular Face Positioning Guide Overlay */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-[#E2C27D] shadow-[0_0_0_9999px_rgba(28,25,23,0.45)]" />
              </div>
            )}

            {!cameraActive && (
              <div className="text-center px-6 py-8 max-w-sm">
                <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-6 h-6 text-[#E2C27D]" />
                </div>
                <p className="text-white text-sm font-medium mb-1">
                  {consentGiven
                    ? 'Ready to start your camera'
                    : 'Confirm consent above to enable your camera'}
                </p>
                <p className="text-stone-300 text-xs leading-relaxed mb-5">
                  Position your face inside the circular guide for the clearest match.
                </p>
                <button
                  type="button"
                  disabled={!consentGiven || cameraStarting}
                  onClick={() => void startCamera()}
                  className="px-5 py-2.5 bg-[#B8924A] text-white text-sm font-medium rounded-lg hover:bg-[#9A742D] transition-colors disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {cameraStarting ? 'Starting Camera...' : 'Enable Camera Preview'}
                </button>
              </div>
            )}

            {processingScan && (
              <div className="absolute inset-0 bg-[#1C1917]/75 backdrop-blur-xs flex flex-col items-center justify-center text-white px-6 text-center">
                <div className="w-10 h-10 border-2 border-[#E2C27D] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm font-medium">Analyzing facial geometry...</p>
                <p className="text-xs text-stone-300 mt-1">
                  Preparing ephemeral match signature
                </p>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {cameraActive && (
                <>
                  <button
                    type="button"
                    disabled={!modelsReady || processingScan}
                    onClick={() => void handleCaptureCamera()}
                    className="flex-1 sm:flex-initial h-11 px-6 bg-[#1C1917] text-white text-sm font-medium rounded-xl hover:bg-[#9A742D] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{modelsReady ? 'Capture & Find My Photos' : 'Loading AI Models...'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    disabled={processingScan}
                    className="h-11 px-3.5 border border-[#D6D3CD] text-[#57534E] hover:text-[#1C1917] rounded-xl hover:bg-[#F3F0EA] transition-colors"
                    title="Restart camera"
                    aria-label="Restart camera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void handleFileUpload(e)}
              />
              <button
                type="button"
                disabled={!consentGiven || !modelsReady || processingScan}
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto h-11 px-5 border border-[#D6D3CD] text-[#1C1917] text-sm font-medium rounded-xl hover:bg-[#F3F0EA] transition-colors disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                <span>Upload a Photo Instead</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
