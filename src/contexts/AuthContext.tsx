import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  companyId: string | null;
  companyName: string | null;
  isActive: boolean;
  role: string | null;
  partnerId: string | null;
  appMode: string | null;
  segment: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [role, setRole] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<string | null>(null);
  const [segment, setSegment] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompany = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('company_users')
        .select('company_id, role, partner_id, companies(name, is_active, app_mode, segment, logo_url, primary_color)')
        .eq('user_id', userId)
        .single();
      
      if (data?.company_id) {
        setCompanyId(data.company_id);
        setRole(data.role);
        setPartnerId(data.partner_id);
        // @ts-ignore
        setCompanyName(data.companies?.name ?? null);
        // @ts-ignore
        setIsActive(data.companies?.is_active ?? true);
        // @ts-ignore
        setAppMode(data.companies?.app_mode ?? 'full');
        // @ts-ignore
        setSegment(data.companies?.segment ?? null);
        // @ts-ignore
        setLogoUrl(data.companies?.logo_url ?? null);
        // @ts-ignore
        setPrimaryColor(data.companies?.primary_color ?? null);

        // Apply primary color as a CSS variable if exists
        // @ts-ignore
        const color = data.companies?.primary_color;
        if (color) {
          document.documentElement.style.setProperty('--primary', color);
          document.documentElement.style.setProperty('--sidebar-primary', color);
        }
      }
    } catch (e) {
      console.error("Error fetching company", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCompany(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchCompany(session.user.id);
        } else {
          setCompanyId(null);
          setCompanyName(null);
          setRole(null);
          setPartnerId(null);
          setAppMode(null);
          setSegment(null);
          setLogoUrl(null);
          setPrimaryColor(null);
          document.documentElement.style.removeProperty('--primary');
          document.documentElement.style.removeProperty('--sidebar-primary');
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, companyId, companyName, isActive, role, partnerId, appMode, segment, logoUrl, primaryColor, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

