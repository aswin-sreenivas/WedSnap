import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Camera,
  ChevronRight,
  Cpu,
  FolderSync,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  SearchCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLayoutProps {
  breadcrumbs: Array<{ label: string; to?: string }>;
  eventId?: string;
  eventTitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminLayout({
  breadcrumbs,
  eventId,
  eventTitle,
  actions,
  children,
}: AdminLayoutProps) {
  const { user, driveAccessToken, signInWithGoogle, signOut, isSigningIn } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
      isActive
        ? 'bg-[#F3F0EA] text-[#1C1917] border border-[#E7E2D8]'
        : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0EA]/60'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center justify-between border-b border-[#E7E2D8]">
        <Link
          to="/"
          className="font-display text-2xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0"
        >
          WedSnap
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-2 text-[#57534E] hover:text-[#1C1917]"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div className="space-y-1">
          <p className="px-3 pb-1 text-xs font-medium text-[#78716C]">Workspace</p>
          <NavLink to="/admin" end className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>All Events</span>
          </NavLink>
          <NavLink
            to="/admin/events/new"
            className={navLinkClass}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Create Event</span>
          </NavLink>
          <NavLink
            to="/admin/seo"
            className={navLinkClass}
            onClick={() => setMobileMenuOpen(false)}
          >
            <SearchCheck className="w-4 h-4 shrink-0" />
            <span>SEO &amp; Search Console</span>
          </NavLink>
        </div>

        {eventId && (
          <div className="space-y-1 pt-4 border-t border-[#E7E2D8]">
            <p className="px-3 pb-1 text-xs font-medium text-[#78716C] truncate">
              {eventTitle || 'Selected Event'}
            </p>
            <NavLink
              to={`/admin/events/${eventId}/drive`}
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <HardDrive className="w-4 h-4 shrink-0" />
              <span>Google Drive</span>
            </NavLink>
            <NavLink
              to={`/admin/events/${eventId}/sync`}
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <FolderSync className="w-4 h-4 shrink-0" />
              <span>Photo Sync</span>
            </NavLink>
            <NavLink
              to={`/admin/events/${eventId}/processing`}
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Cpu className="w-4 h-4 shrink-0" />
              <span>Face Indexing & QR</span>
            </NavLink>
          </div>
        )}

        <div className="pt-4 border-t border-[#E7E2D8] px-3">
          <div className="p-3.5 rounded-xl bg-[#F3F0EA] border border-[#E7E2D8]">
            <p className="text-xs font-medium text-[#1C1917] mb-1">Google Drive Access</p>
            <p className="text-xs text-[#57534E] mb-3 leading-relaxed">
              {driveAccessToken
                ? 'Connected in this session for folder browsing and photo sync.'
                : 'Reconnect Google to grant read access for syncing Drive folders.'}
            </p>
            {!driveAccessToken && (
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                disabled={isSigningIn}
                className="w-full px-3 py-2 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {isSigningIn ? 'Connecting...' : 'Reconnect Drive'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#E7E2D8] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Organizer'}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-[#E7E2D8] shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#F3F0EA] border border-[#E7E2D8] flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4 text-[#9A742D]" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#1C1917] truncate">
              {user?.displayName || 'Organizer'}
            </p>
            <p className="text-[11px] text-[#78716C] truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="p-2 text-[#57534E] hover:text-[#1C1917] rounded-lg hover:bg-[#F3F0EA] transition-colors shrink-0"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-white border-r border-[#E7E2D8]">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#1C1917]/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-full bg-white h-full border-r border-[#E7E2D8] z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-sm border-b border-[#E7E2D8] px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-[#57534E] hover:text-[#1C1917] rounded-lg hover:bg-[#F3F0EA]"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={`${crumb.label}-${idx}`}>
                  {idx > 0 && <ChevronRight className="w-4 h-4 text-[#A8A29E] shrink-0" />}
                  {crumb.to ? (
                    <Link
                      to={crumb.to}
                      className="text-[#57534E] hover:text-[#1C1917] transition-colors truncate"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-[#1C1917] truncate">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>
          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </header>

        <main className="flex-1 p-6 sm:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
