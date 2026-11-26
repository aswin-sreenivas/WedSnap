/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AnalyticsConsentBanner } from './components/AnalyticsConsentBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HomePage } from './pages/HomePage';

const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage }))
);
const HowItWorksPage = lazy(() =>
  import('./pages/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage }))
);
const FeaturesPage = lazy(() =>
  import('./pages/FeaturesPage').then((m) => ({ default: m.FeaturesPage }))
);
const ForPhotographersPage = lazy(() =>
  import('./pages/ForPhotographersPage').then((m) => ({ default: m.ForPhotographersPage }))
);
const PricingPage = lazy(() =>
  import('./pages/PricingPage').then((m) => ({ default: m.PricingPage }))
);
const PrivacyPolicyPage = lazy(() =>
  import('./pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage }))
);
const TermsPage = lazy(() =>
  import('./pages/TermsPage').then((m) => ({ default: m.TermsPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const BlogIndexPage = lazy(() =>
  import('./pages/BlogIndexPage').then((m) => ({ default: m.BlogIndexPage }))
);
const BlogArticlePage = lazy(() =>
  import('./pages/BlogArticlePage').then((m) => ({ default: m.BlogArticlePage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

const GuestEventLandingPage = lazy(() =>
  import('./pages/GuestEventLandingPage').then((m) => ({ default: m.GuestEventLandingPage }))
);
const GuestScanPage = lazy(() =>
  import('./pages/GuestScanPage').then((m) => ({ default: m.GuestScanPage }))
);
const GuestResultsPage = lazy(() =>
  import('./pages/GuestResultsPage').then((m) => ({ default: m.GuestResultsPage }))
);
const AdminLoginPage = lazy(() =>
  import('./pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const CreateEventPage = lazy(() =>
  import('./pages/CreateEventPage').then((m) => ({ default: m.CreateEventPage }))
);
const DriveConnectionPage = lazy(() =>
  import('./pages/DriveConnectionPage').then((m) => ({ default: m.DriveConnectionPage }))
);
const PhotoSyncPage = lazy(() =>
  import('./pages/PhotoSyncPage').then((m) => ({ default: m.PhotoSyncPage }))
);
const FaceProcessingPage = lazy(() =>
  import('./pages/FaceProcessingPage').then((m) => ({ default: m.FaceProcessingPage }))
);
const AdminSeoPage = lazy(() =>
  import('./pages/AdminSeoPage').then((m) => ({ default: m.AdminSeoPage }))
);

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
      <div className="w-9 h-9 border-2 border-[#9A742D] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, authReady, ensureAuthInitialized } = useAuth();

  useEffect(() => {
    void ensureAuthInitialized();
  }, [ensureAuthInitialized]);

  if (!authReady) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Core Public SEO Pages */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/for-photographers" element={<ForPhotographersPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/contact" element={<ContactPage />} />

              {/* Editorial Blog */}
              <Route path="/blog" element={<BlogIndexPage />} />
              <Route path="/blog/:slug" element={<BlogArticlePage />} />

              {/* Guest Wedding Gallery Flows */}
              <Route path="/e/:slug" element={<GuestEventLandingPage />} />
              <Route path="/e/:slug/scan" element={<GuestScanPage />} />
              <Route path="/e/:slug/results" element={<GuestResultsPage />} />
              <Route path="/e/:slug/results/:photoId" element={<GuestResultsPage />} />

              {/* Admin Studio Routes (Always Noindex) */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <AdminDashboardPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/events/new"
                element={
                  <RequireAuth>
                    <CreateEventPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/events/:eventId/drive"
                element={
                  <RequireAuth>
                    <DriveConnectionPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/events/:eventId/sync"
                element={
                  <RequireAuth>
                    <PhotoSyncPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/events/:eventId/processing"
                element={
                  <RequireAuth>
                    <FaceProcessingPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/seo"
                element={
                  <RequireAuth>
                    <AdminSeoPage />
                  </RequireAuth>
                }
              />

              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <AnalyticsConsentBanner />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
