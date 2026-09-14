import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  companyId: string | null;
  companyName: string | null;
  isActive: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompany = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('company_users')
        .select('company_id, companies(name, is_active)')
        .eq('user_id', userId)
        .single();
      
      if (data?.company_id) {
        setCompanyId(data.company_id);
        // @ts-ignore
        setCompanyName(data.companies?.name ?? null);
        // @ts-ignore
        setIsActive(data.companies?.is_active ?? true);
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
    <AuthContext.Provider value={{ session, user, companyId, companyName, isActive, isLoading, signOut }}>
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

