import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Role = 'admin' | 'medecin' | null;
type MedecinStatus = 'pending' | 'approved' | 'rejected' | null;

interface AuthContextType {
  session: Session | null;
  role: Role;
  medecinStatus: MedecinStatus;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  role: null,
  medecinStatus: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [medecinStatus, setMedecinStatus] = useState<MedecinStatus>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      setRole(null);
      setMedecinStatus(null);
      return;
    }

    setRole(profile.role as Role);

    if (profile.role === 'medecin') {
      const { data: medecin } = await supabase
        .from('medecins')
        .select('status')
        .eq('id', userId)
        .single();
      setMedecinStatus((medecin?.status as MedecinStatus) ?? 'pending');
    } else {
      setMedecinStatus(null);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await loadProfile(session.user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        await loadProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user?.id) {
          await loadProfile(session.user.id);
        } else {
          setRole(null);
          setMedecinStatus(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, role, medecinStatus, loading, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
