import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("demo@kalinga.ai");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError("Connection failed.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-orbitron relative overflow-hidden transition-colors duration-300">
      {/* Background Ambience - Adapts to theme via CSS vars if configured, or just subtle gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />

      <div className="w-full max-w-md bg-card/60 border border-border/50 backdrop-blur-xl rounded-2xl shadow-2xl px-8 py-10 relative z-10 animate-fade-in ring-1 ring-white/5">

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
            <i className="fas fa-brain text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-foreground">KALINGA AI</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mt-2">Secure Access Terminal</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center font-mono">
            [ERROR] {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-medium text-muted-foreground tracking-widest pl-1">Identity</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 text-sm rounded-lg bg-background/50 border border-input focus:border-primary/50 focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all text-foreground placeholder:text-muted-foreground/30 font-sans"
              placeholder="Enter ID..."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-medium text-muted-foreground tracking-widest pl-1">Passkey</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 text-sm rounded-lg bg-background/50 border border-input focus:border-primary/50 focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all text-foreground placeholder:text-muted-foreground/30 font-sans"
              placeholder="Enter Passkey..."
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-4 text-xs font-bold uppercase tracking-widest rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-circle-notch animate-spin" /> ESTABLISHING LINK...
              </span>
            ) : (
              "Connect"
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-muted-foreground/40 font-mono">v2.4.0-STABLE // UNIT-841</p>
        </div>
      </div>
    </div>
  );
}