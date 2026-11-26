import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  driveAccessToken: string | null;
  isSigningIn: boolean;
  ensureAuthInitialized: () => Promise<void>;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const ensureAuthInitialized = useCallback(async () => {
    if (unsubscribeRef.current) return;
    if (initPromiseRef.current) {
      await initPromiseRef.current;
      return;
    }

    initPromiseRef.current = (async () => {
      const fb = await import('../lib/firebase');
      setDriveAccessToken(fb.getCachedDriveAccessToken());
      unsubscribeRef.current = fb.subscribeToAuth((nextUser, token) => {
        setUser(nextUser);
        setDriveAccessToken(token);
        setAuthReady(true);
      });
    })();

    await initPromiseRef.current;
  }, []);

  useEffect(() => {
    // Only hydrate Firebase Auth automatically on organizer workspace routes to keep public LCP lightweight
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      void ensureAuthInitialized();
    }
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [ensureAuthInitialized]);

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    try {
      await ensureAuthInitialized();
      const [fb, eventsSvc] = await Promise.all([
        import('../lib/firebase'),
        import('../lib/eventsService'),
      ]);
      const { user: signedInUser, driveAccessToken: token } = await fb.signInWithGoogleDrive();
      setUser(signedInUser);
      setDriveAccessToken(token);
      setAuthReady(true);
      await eventsSvc.upsertUserProfile(signedInUser);
      return signedInUser;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    const fb = await import('../lib/firebase');
    await fb.signOutUser();
    setUser(null);
    setDriveAccessToken(null);
  };

  const getIdToken = async () => {
    if (!user) {
      throw new Error('Authentication required.');
    }
    return user.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        driveAccessToken,
        isSigningIn,
        ensureAuthInitialized,
        signInWithGoogle,
        signOut,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
