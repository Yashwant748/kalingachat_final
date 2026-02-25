import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./useAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Initialize from LocalStorage for instant access (Optimistic UI)
  const [localUser, setLocalUser] = React.useState<{ id: number; name: string; email: string } | null>(() => {
    const saved = localStorage.getItem("demo_user");
    return saved ? JSON.parse(saved) : null;
  });

  // 2. Background Sync & Validation
  // Critical for Demo: If server restarts (memory cleared), our local user is stale.
  // We must validate with backend. If 401/Null, force logout so user can re-login.
  const { data: serverAuth, isError } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        if (res.status === 401) return null;
        const data = await res.json();
        return data; // { user: ... }
      } catch (error) {
        return null;
      }
    },
    retry: false,
    refetchOnMount: true, // Check every time app loads
  });

  // Sync state: If server says we are NOT logged in, but we think we are, LOGOUT.
  useEffect(() => {
    // Wait for the query to actually resolve (undefined = loading)
    if (serverAuth !== undefined) {
      if ((serverAuth === null || !serverAuth.user) && localUser) {
        // Server restart detected (Memory DB wiped) -> Clear local state & Redirect
        localStorage.removeItem("demo_user");
        setLocalUser(null);
        queryClient.setQueryData(["/api/auth/me"], null);
        navigate("/login");
        // toast({ title: "Session Expired", description: "Please log in again." });
      } else if (serverAuth?.user) {
        // Server confirms user -> Update local to match strict server state
        if (JSON.stringify(serverAuth.user) !== JSON.stringify(localUser)) {
          localStorage.setItem("demo_user", JSON.stringify(serverAuth.user));
          setLocalUser(serverAuth.user);
        }
      }
    }
  }, [serverAuth, localUser, navigate, queryClient]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      return data.user;
    },
    onSuccess: (user) => {
      // Persist
      localStorage.setItem("demo_user", JSON.stringify(user));
      setLocalUser(user);

      queryClient.setQueryData(["/api/auth/me"], { user });
      navigate("/");
      toast({ title: "System Online", description: "Welcome to KalingaAI" });
    },
    onError: (error: any) => {
      toast({ title: "Login Error", description: "System is offline.", variant: "destructive" });
    }
  });

  // Mapper: Register just calls login (since backend auto-creates)
  const registerMutation = useMutation({
    mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      return loginMutation.mutateAsync({ email, password });
    },
    onSuccess: () => {
      // Handled by loginMutation
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try { await apiRequest("POST", "/api/auth/logout"); } catch (e) { }
    },
    onSuccess: () => {
      localStorage.removeItem("demo_user");
      setLocalUser(null);
      queryClient.setQueryData(["/api/auth/me"], null);
      navigate("/login");
      toast({
        title: "Signed out",
        description: "See you later!"
      });
    }
  });

  return (
    <AuthContext.Provider
      value={{
        user: localUser,
        isLoading: false,
        isAuthenticated: !!localUser,
        login: async (email, password) => await loginMutation.mutateAsync({ email, password }),
        register: async (name, email, password) => await loginMutation.mutateAsync({ email, password }),
        logout: async () => await logoutMutation.mutateAsync()
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
