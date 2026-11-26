import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  SearchCheck,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { SeoHead } from '../components/SeoHead';
import {
  LiveEndpointChecks,
  runLiveEndpointAudit,
  runStaticSeoAudit,
} from '../lib/seoAudit';

export function AdminSeoPage() {
  const staticAudit = useMemo(() => runStaticSeoAudit(), []);
  const [liveChecks, setLiveChecks] = useState<LiveEndpointChecks | null>(null);
  const [checkingLive, setCheckingLive] = useState(true);

  const runLiveChecks = async () => {
    setCheckingLive(true);
    try {
      const result = await runLiveEndpointAudit();
      setLiveChecks(result);
    } finally {
      setCheckingLive(false);
    }
  };

  useEffect(() => {
    void runLiveChecks();
  }, []);

  const gaConfigured = Boolean((import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim());

  const StatusIcon = ({ status }: { status: 'pass' | 'warn' | 'fail' }) => {
    if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />;
    if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />;
    return <XCircle className="w-4 h-4 text-[#B91C1C] shrink-0" />;
  };

  return (
    <AdminLayout
      breadcrumbs={[
        { label: 'Organizer Studio', to: '/admin' },
        { label: 'SEO & Search Console' },
      ]}
      actions={
        <button
          type="button"
          onClick={() => void runLiveChecks()}
          disabled={checkingLive}
          className="px-4 py-2 text-xs font-medium border border-[#D6D3CD] bg-white text-[#1C1917] rounded-lg hover:bg-[#F3F0EA] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checkingLive ? 'animate-spin' : ''}`} />
          <span>Re-run Live Checks</span>
        </button>
      }
    >
      <SeoHead
        title="SEO Health & Search Console Readiness | WedSnap Studio"
        description="Automated technical SEO audit and manual Google Search Console deployment checklist."
        path="/admin/seo"
        robots="noindex, nofollow"
      />

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#1C1917] mb-1">
            Technical SEO &amp; Search Console Readiness
          </h1>
          <p className="text-sm text-[#57534E]">
            Live automated verification of WedSnap SSR responses, route indexability, canonical URLs, JSON-LD, images, and privacy exclusions—strictly separated from external Google Search Console telemetry.
          </p>
        </div>

        {/* Automated Local & Server Endpoint Checks */}
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#9A742D]">
              <SearchCheck className="w-4 h-4" />
              <span>Automated Route Metadata &amp; Content Completeness</span>
            </div>
            <ul className="space-y-3">
              {staticAudit.checks.map((item) => (
                <li
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E7E2D8] flex items-start gap-3"
                >
                  <StatusIcon status={item.status} />
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">{item.label}</p>
                    <p className="text-xs text-[#57534E] mt-0.5">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#9A742D]">
                <ShieldAlert className="w-4 h-4" />
                <span>Automated Live SSR, Crawl &amp; Asset Checks</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1C1917] hover:text-[#9A742D] inline-flex items-center gap-1"
                >
                  <span>robots.txt</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1C1917] hover:text-[#9A742D] inline-flex items-center gap-1"
                >
                  <span>sitemap.xml</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {liveChecks ? (
              <ul className="space-y-2.5">
                <li className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E7E2D8] flex items-start gap-3">
                  <StatusIcon
                    status={liveChecks.robotsOk && liveChecks.robotsHasSitemap ? 'pass' : 'fail'}
                  />
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">/robots.txt Served</p>
                    <p className="text-xs text-[#57534E]">
                      {liveChecks.robotsOk
                        ? 'Returns HTTP 200 with Disallow rules for /admin, /api/, /scan, /results and Sitemap URL.'
                        : 'robots.txt check failed.'}
                    </p>
                  </div>
                </li>

                <li className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E7E2D8] flex items-start gap-3">
                  <StatusIcon
                    status={liveChecks.sitemapOk && liveChecks.sitemapExcludesPrivate ? 'pass' : 'fail'}
                  />
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">/sitemap.xml Dynamic Feed</p>
                    <p className="text-xs text-[#57534E]">
                      Contains <span className="font-mono">{liveChecks.sitemapUrlCount}</span> canonical public URL(s); private admin/scan/results URLs excluded.
                    </p>
                  </div>
                </li>

                <li className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E7E2D8] flex items-start gap-3">
                  <StatusIcon
                    status={
                      liveChecks.ssrRoutesPassed === liveChecks.ssrRoutesChecked ? 'pass' : 'fail'
                    }
                  />
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">
                      Server-Rendered HTML, Canonicals &amp; JSON-LD
                    </p>
                    <p className="text-xs text-[#57534E]">
                      {liveChecks.ssrRoutesPassed}/{liveChecks.ssrRoutesChecked} sampled public routes returned HTTP 200 with canonical, H1, and meta tags ({liveChecks.structuredDataRoutesPassed} with JSON-LD).
                    </p>
                  </div>
                </li>

                <li className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E7E2D8] flex items-start gap-3">
                  <StatusIcon
                    status={
                      liveChecks.unknownReturns404 &&
                      liveChecks.privateRoutesNoindex &&
                      liveChecks.trailingSlashRedirects
                        ? 'pass'
                        : 'warn'
                    }
                  />
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">
                      HTTP 404, Trailing Slash 301 &amp; Private Noindex
                    </p>
                    <p className="text-xs text-[#57534E]">
                      Unknown path HTTP 404: {liveChecks.unknownReturns404 ? 'Yes' : 'No'} · Private noindex:{' '}
                      {liveChecks.privateRoutesNoindex ? 'Verified' : 'Check failed'} · Trailing slash 301:{' '}
                      {liveChecks.trailingSlashRedirects ? 'Active' : 'Check failed'}.
                    </p>
                  </div>
                </li>

                <li className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E7E2D8] flex items-start gap-3">
                  <StatusIcon status={liveChecks.brokenImagesCount === 0 ? 'pass' : 'fail'} />
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">
                      Public Image &amp; Manifest Verification
                    </p>
                    <p className="text-xs text-[#57534E]">
                      {liveChecks.brokenImagesCount === 0
                        ? `All public editorial & OG image assets returned HTTP 200; manifest active: ${
                            liveChecks.manifestOk ? 'Yes' : 'No'
                          }.`
                        : `${liveChecks.brokenImagesCount} broken image asset(s): ${liveChecks.brokenImages.join(', ')}`}
                    </p>
                  </div>
                </li>

                <li className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E7E2D8] flex items-start gap-3">
                  <StatusIcon status={gaConfigured ? 'pass' : 'warn'} />
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">
                      Google Analytics 4 (Consent-Gated)
                    </p>
                    <p className="text-xs text-[#57534E]">
                      {gaConfigured
                        ? 'VITE_GA_MEASUREMENT_ID is configured; aggregate tracking awaits visitor consent.'
                        : 'Optional: set VITE_GA_MEASUREMENT_ID in environment variables to enable consent-gated GA4 tracking.'}
                    </p>
                  </div>
                </li>
              </ul>
            ) : (
              <p className="text-xs text-[#57534E]">Running live endpoint &amp; SSR checks...</p>
            )}
          </div>
        </section>

        {/* Manual Google Search Console & Production Verification Checklist */}
        <section className="bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-8 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#9A742D] mb-1">
              External Google Search Console Actions (Not Automated)
            </p>
            <h2 className="text-2xl font-semibold text-[#1C1917]">
              Google Search Console Verification &amp; Indexing Checklist
            </h2>
            <p className="text-sm text-[#57534E] mt-1">
              Real Google Search Console index coverage, impressions, and domain ownership require your Google account and final custom domain DNS access:
            </p>
          </div>
          <ol className="space-y-3 text-sm text-[#1C1917] list-decimal pl-5">
            <li>
              <strong>Set Canonical Production URL:</strong> Configure{' '}
              <code className="font-mono text-xs bg-[#F3F0EA] px-1.5 py-0.5 rounded">APP_URL</code> to your final HTTPS domain so canonical tags, OpenGraph URLs,{' '}
              <code className="font-mono text-xs bg-[#F3F0EA] px-1.5 py-0.5 rounded">robots.txt</code>, and{' '}
              <code className="font-mono text-xs bg-[#F3F0EA] px-1.5 py-0.5 rounded">sitemap.xml</code> reference your primary domain.
            </li>
            <li>
              <strong>Verify Property Ownership:</strong> Add your domain in Google Search Console via DNS TXT record verification.
            </li>
            <li>
              <strong>Submit Sitemap:</strong> In Search Console &rarr; Sitemaps, submit{' '}
              <code className="font-mono text-xs bg-[#F3F0EA] px-1.5 py-0.5 rounded">
                {typeof window !== 'undefined' ? `${window.location.origin}/sitemap.xml` : '/sitemap.xml'}
              </code>
              .
            </li>
            <li>
              <strong>Inspect Priority URLs &amp; Core Web Vitals:</strong> Run URL Inspection on{' '}
              <code className="font-mono text-xs bg-[#F3F0EA] px-1.5 py-0.5 rounded">/</code>,{' '}
              <code className="font-mono text-xs bg-[#F3F0EA] px-1.5 py-0.5 rounded">/how-it-works</code>, and{' '}
              <code className="font-mono text-xs bg-[#F3F0EA] px-1.5 py-0.5 rounded">/blog</code>, and monitor Search Console Page Experience reports after real traffic arrives.
            </li>
          </ol>
        </section>

        {/* Full Public Route Table */}
        <section className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E7E2D8] flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#1C1917]">
              Indexable Route Metadata Inventory ({staticAudit.routes.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E7E2D8] bg-[#FAF9F6] text-[#78716C]">
                  <th className="py-3 px-5 font-medium">Route</th>
                  <th className="py-3 px-4 font-medium">Title</th>
                  <th className="py-3 px-4 font-medium text-right">Title Len</th>
                  <th className="py-3 px-4 font-medium text-right">Desc Len</th>
                  <th className="py-3 px-5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]">
                {staticAudit.routes.map((row) => (
                  <tr key={row.path} className="hover:bg-[#FAF9F6]">
                    <td className="py-2.5 px-5 font-mono">
                      <Link to={row.path} className="text-[#9A742D] hover:underline">
                        {row.path}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-[#1C1917] max-w-md truncate">{row.title}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#57534E]">
                      {row.titleLength}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#57534E]">
                      {row.descriptionLength}
                    </td>
                    <td className="py-2.5 px-5 text-right">
                      {row.issues.length === 0 ? (
                        <span className="text-[#15803D] font-medium">OK</span>
                      ) : (
                        <span className="text-[#B45309] font-medium" title={row.issues.join('; ')}>
                          {row.issues[0]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
