import React from 'react';
import { Link } from 'react-router-dom';

export function PublicFooter() {
  return (
    <footer className="border-t border-[#E7E2D8] bg-white pt-14 pb-10 text-[#57534E]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#E7E2D8]">
          <div className="space-y-3">
            <Link
              to="/"
              className="font-display text-2xl font-semibold tracking-tight text-[#1C1917] inline-block"
            >
              WedSnap
            </Link>
            <p className="text-xs leading-relaxed text-[#57534E]">
              Privacy-first AI wedding photo finder synced directly with Google Drive. Built for wedding photographers, couples, and guests.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#1C1917] mb-3">Platform</p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/features" className="hover:text-[#1C1917] transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-[#1C1917] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/for-photographers" className="hover:text-[#1C1917] transition-colors">
                  For Photographers
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-[#1C1917] transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#1C1917] mb-3">Resources</p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/blog" className="hover:text-[#1C1917] transition-colors">
                  WedSnap Journal
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#1C1917] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#1C1917] transition-colors">
                  Contact &amp; Support
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-[#1C1917] transition-colors">
                  Organizer Studio
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#1C1917] mb-3">Trust &amp; Legal</p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/privacy-policy" className="hover:text-[#1C1917] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-[#1C1917] transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716C]">
          <span>&copy; {new Date().getFullYear()} WedSnap. All rights reserved.</span>
          <span>Ephemeral Guest Face Matching · Google Drive Photo Sync</span>
        </div>
      </div>
    </footer>
  );
}
