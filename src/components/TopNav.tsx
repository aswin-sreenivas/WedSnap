import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function TopNav() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E7E2D8]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <Link
          to="/"
          className="font-display text-2xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0"
        >
          WedSnap
        </Link>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57534E]">
          <Link
            to="/how-it-works"
            className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
          >
            How It Works
          </Link>
          <Link
            to="/features"
            className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
          >
            Features
          </Link>
          <Link
            to="/for-photographers"
            className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
          >
            Photographers
          </Link>
          <Link
            to="/blog"
            className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
          >
            Blog
          </Link>
        </nav>

        {/* Zone 3: 1 primary action + mobile drawer trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={user ? '/admin' : '/admin/login'}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#9A742D] transition-colors whitespace-nowrap shrink-0"
          >
            {user ? 'Dashboard' : 'Host a Wedding'}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 text-[#57534E] hover:text-[#1C1917] rounded-lg hover:bg-[#F3F0EA]"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Mobile"
          className="md:hidden border-t border-[#E7E2D8] bg-white px-6 py-4 flex flex-col gap-3 text-sm font-medium text-[#1C1917]"
        >
          <Link to="/how-it-works" onClick={() => setMobileOpen(false)}>
            How It Works
          </Link>
          <Link to="/features" onClick={() => setMobileOpen(false)}>
            Features
          </Link>
          <Link to="/for-photographers" onClick={() => setMobileOpen(false)}>
            For Photographers
          </Link>
          <Link to="/pricing" onClick={() => setMobileOpen(false)}>
            Pricing
          </Link>
          <Link to="/blog" onClick={() => setMobileOpen(false)}>
            Blog
          </Link>
          <Link to="/about" onClick={() => setMobileOpen(false)}>
            About
          </Link>
          <Link to="/contact" onClick={() => setMobileOpen(false)}>
            Contact
          </Link>
        </nav>
      )}
    </header>
  );
}
