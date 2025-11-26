import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom"; // FIXED: Use react-router-dom
import { AuthContext } from "./useAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate(); // FIXED: Use navigate hook
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Session-based auth: Just ask the server "Who am I?"
  // The browser sends the cookie automatically.
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        // If 401, apiRequest might throw or return error status
        if (res.status === 401) return null;
        const data = await res.json();
        return data; // Expecting { user: ... }
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      if (!res.ok) throw new Error("Login failed");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigate("/"); // FIXED: Navigate to home
      toast({
        title: "Welcome back!",
        description: "Successfully signed in"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sign in failed",
        description: "Please check your credentials",
        variant: "destructive"
      });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", { name, email, password });
      if (!res.ok) throw new Error("Registration failed");
      return await res.json();
    },
    onSuccess: () => {
      // After register, usually we want to login or redirect to login
      // For this app, let's redirect to login
      navigate("/login");
      toast({
        title: "Account created!",
        description: "Please sign in with your new account"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null); // Clear user data
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
        user: user?.user || null,
        isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
        isAuthenticated: !!user?.user,
        login: async (email, password) => await loginMutation.mutateAsync({ email, password }),
        register: async (name, email, password) => await registerMutation.mutateAsync({ name, email, password }),
        logout: async () => await logoutMutation.mutateAsync()
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
