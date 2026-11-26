import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PublicFooter } from '../components/PublicFooter';
import { SeoHead } from '../components/SeoHead';
import { TopNav } from '../components/TopNav';

export function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title="Page Not Found | WedSnap"
        description="The requested WedSnap page could not be found."
        path={location.pathname}
        robots="noindex, nofollow"
      />
      <TopNav />

      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-lg w-full bg-white border border-[#E7E2D8] rounded-3xl p-8 sm:p-10 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-[#9A742D] mb-2">
            404 · Not Found
          </p>
          <h1 className="text-4xl font-semibold text-[#1C1917] mb-3">
            This page could not be found
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed mb-7">
            The wedding gallery or article link may have moved or is no longer published.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="px-5 py-2.5 bg-[#1C1917] text-white text-sm font-medium rounded-lg hover:bg-[#9A742D] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return Home</span>
            </Link>
            <Link
              to="/blog"
              className="px-5 py-2.5 border border-[#D6D3CD] text-[#1C1917] text-sm font-medium rounded-lg hover:bg-[#F3F0EA] transition-colors whitespace-nowrap"
            >
              Browse Journal
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
