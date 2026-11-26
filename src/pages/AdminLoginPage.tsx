import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, FolderSync, QrCode } from 'lucide-react';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { trackAnalyticsEvent } from '../lib/analytics';

export function AdminLoginPage() {
  const { user, authReady, driveAccessToken, ensureAuthInitialized, signInWithGoogle, isSigningIn } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    void ensureAuthInitialized();
  }, [ensureAuthInitialized]);

  useEffect(() => {
    if (authReady && user && driveAccessToken) {
      navigate('/admin', { replace: true });
    }
  }, [authReady, user, driveAccessToken, navigate]);

  const handleSignIn = async () => {
    setErrorMsg('');
    try {
      const signedIn = await signInWithGoogle();
      if (signedIn) {
        trackAnalyticsEvent('organizer_signup');
        navigate('/admin');
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Google sign-in was cancelled or failed. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title="Organizer Sign In | WedSnap"
        description="Sign in to the WedSnap Organizer Studio."
        path="/admin/login"
        robots="noindex, nofollow"
      />
      <header className="border-b border-[#E7E2D8] bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#57534E] hover:text-[#1C1917]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to WedSnap</span>
          </Link>
          <span className="font-display text-2xl font-semibold text-[#1C1917]">WedSnap</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-14">
        <div className="max-w-md w-full bg-white border border-[#E7E2D8] rounded-3xl p-8 sm:p-10 shadow-xs">
          <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D] mb-2">
            Organizer Studio
          </p>
          <h1 className="text-3xl font-semibold text-[#1C1917] mb-2">
            Sign in to manage weddings
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed mb-7">
            Use your Google account to create wedding events, browse Google Drive folders, and publish guest QR galleries.
          </p>

          <div className="space-y-3 mb-7 text-xs text-[#57534E]">
            <div className="flex items-center gap-3">
              <FolderSync className="w-4 h-4 text-[#9A742D] shrink-0" />
              <span>Read-only access to browse &amp; sync your selected Drive folders</span>
            </div>
            <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-[#9A742D] shrink-0" />
              <span>Automated multi-face indexing across ceremony &amp; reception albums</span>
            </div>
            <div className="flex items-center gap-3">
              <QrCode className="w-4 h-4 text-[#9A742D] shrink-0" />
              <span>Instant unique event links &amp; downloadable guest QR codes</span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <GoogleSignInButton
              onClick={() => void handleSignIn()}
              disabled={isSigningIn}
              label={isSigningIn ? 'Signing in with Google...' : 'Sign in with Google'}
            />
            {user && !driveAccessToken && (
              <Link
                to="/admin"
                className="text-center text-xs font-medium text-[#57534E] hover:text-[#1C1917] underline underline-offset-4 pt-1"
              >
                Continue to Dashboard without Drive sync
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
