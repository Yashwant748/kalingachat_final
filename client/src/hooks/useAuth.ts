import { useState, useEffect, createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback implementation when context is not available
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: user, isLoading } = useQuery({
      queryKey: ["/api/auth/me"],
      queryFn: async () => {
        try {
          const res = await apiRequest("GET", "/api/auth/me");
          return res.json();
        } catch (error) {
          return null;
        }
      },
      retry: false,
    });

    const loginMutation = useMutation({
      mutationFn: async ({ email, password }: { email: string; password: string }) => {
        const res = await apiRequest("POST", "/api/auth/login", { email, password });
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/");
        toast({
          title: "Welcome back!",
          description: "Successfully signed in to KalingaAI Chat"
        });
      },
      onError: (error: any) => {
        toast({
          title: "Sign in failed",
          description: error.message || "Please check your credentials",
          variant: "destructive"
        });
      }
    });

    const registerMutation = useMutation({
      mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
        const res = await apiRequest("POST", "/api/auth/register", { name, email, password });
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/");
        toast({
          title: "Welcome to KalingaAI!",
          description: "Your account has been created successfully"
        });
      },
      onError: (error: any) => {
        toast({
          title: "Registration failed",
          description: error.message || "Please try again",
          variant: "destructive"
        });
      }
    });

    const logoutMutation = useMutation({
      mutationFn: async () => {
        const res = await apiRequest("POST", "/api/auth/logout");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/login");
        toast({
          title: "Signed out",
          description: "You have been signed out successfully"
        });
      }
    });

    const login = async (email: string, password: string) => {
      return loginMutation.mutateAsync({ email, password });
    };

    const register = async (name: string, email: string, password: string) => {
      return registerMutation.mutateAsync({ name, email, password });
    };

    const logout = async () => {
      return logoutMutation.mutateAsync();
    };

    return {
      user: user?.user || null,
      isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
      isAuthenticated: !!user?.user,
      login,
      register,
      logout
    };
  }
  return context;
}