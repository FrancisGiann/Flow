import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, getFallbackUserId } from '../lib/supabaseClient';

const AuthContext = createContext({
  user: null,
  session: null,
  userId: getFallbackUserId(),
  isAnonymous: true,
  loading: true,
  isConfigured: false,
  upgradeAccount: async () => ({ error: new Error('Supabase not configured') }),
  signInWithOtp: async () => ({ error: new Error('Supabase not configured') }),
  signOut: async () => ({ error: null })
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(() =>
    isSupabaseConfigured ? null : { id: getFallbackUserId(), is_anonymous: true }
  );
  const [loading, setLoading] = useState(() => Boolean(isSupabaseConfigured));

  // Derive effective user ID: from Supabase auth user, or stable local guest UUID
  const userId = user?.id || session?.user?.id || getFallbackUserId();
  const isAnonymous = Boolean(!user || user.is_anonymous || !user.email);

  useEffect(() => {
    // If Supabase is not configured, fallback gracefully to guest mode
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    let isMounted = true;

    async function initAuth() {
      try {
        // 1. Check for existing session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('[Auth] Error getting session:', sessionError.message);
        }

        if (initialSession?.user) {
          if (isMounted) {
            setSession(initialSession);
            setUser(initialSession.user);
            setLoading(false);
          }
          return;
        }

        // 2. If no session, anonymously sign in
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();

        if (anonError) {
          console.warn('[Auth] Anonymous sign-in failed, using local guest UUID:', anonError.message);
          if (isMounted) {
            setUser({ id: getFallbackUserId(), is_anonymous: true });
          }
        } else if (anonData?.user) {
          if (isMounted) {
            setSession(anonData.session);
            setUser(anonData.user);
          }
        }
      } catch (err) {
        console.warn('[Auth] Auth initialization exception, using fallback:', err);
        if (isMounted) {
          setUser({ id: getFallbackUserId(), is_anonymous: true });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // 3. Listen for auth state changes (e.g. Magic Link verification, sign in, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      if (newSession?.user) {
        setUser(newSession.user);
      } else if (event === 'SIGNED_OUT') {
        // Automatically create a new anonymous session on sign out
        supabase.auth.signInAnonymously().then(({ data: anonData, error: anonError }) => {
          if (!isMounted) return;
          if (anonError || !anonData?.user) {
            setUser({ id: getFallbackUserId(), is_anonymous: true });
            setSession(null);
          } else {
            setUser(anonData.user);
            setSession(anonData.session);
          }
        }).catch(() => {
          if (isMounted) {
            setUser({ id: getFallbackUserId(), is_anonymous: true });
            setSession(null);
          }
        });
      }
    });

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Upgrade anonymous account to permanent account with email (retains identical user.id)
  const upgradeAccount = useCallback(async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        data: null,
        error: new Error('Supabase is not configured with valid credentials.')
      };
    }

    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { data, error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: redirectTo }
      );
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  }, []);

  // Sign in existing user or on new device via Magic Link OTP
  const signInWithOtp = useCallback(async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        data: null,
        error: new Error('Supabase is not configured with valid credentials.')
      };
    }

    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo
        }
      });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      const fallbackId = getFallbackUserId();
      setUser({ id: fallbackId, is_anonymous: true });
      setSession(null);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err) {
      return { error: err };
    }
  }, []);

  const value = {
    user,
    session,
    userId,
    isAnonymous,
    loading,
    isConfigured: isSupabaseConfigured,
    upgradeAccount,
    signInWithOtp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
