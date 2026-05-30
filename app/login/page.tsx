"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "sign_in" | "sign_up";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "sign_in") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        // Redirect — middleware will pick up the new session
        window.location.href = "/players";
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setMessage("Check your email to confirm your account.");
        setLoading(false);
      }
    }
  }

  const idleLabel = mode === "sign_in" ? "Sign in" : "Sign up";
  const busyLabel = mode === "sign_in" ? "Signing in…" : "Signing up…";

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-xl border p-8 space-y-6"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* Logo / title */}
        <div className="text-center space-y-1">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--primary)" }}
          >
            FPL Auction Hub
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {mode === "sign_in"
              ? "Sign in to your account"
              : "Create a new account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={
                mode === "sign_in" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && (
            <p className="text-sm" style={{ color: "var(--primary)" }}>
              {message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? busyLabel : idleLabel}
          </Button>
        </form>

        <p
          className="text-center text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          {mode === "sign_in" ? (
            <>
              No account?{" "}
              <button
                type="button"
                className="underline hover:opacity-80"
                style={{ color: "var(--primary)" }}
                onClick={() => {
                  setMode("sign_up");
                  setError(null);
                  setMessage(null);
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="underline hover:opacity-80"
                style={{ color: "var(--primary)" }}
                onClick={() => {
                  setMode("sign_in");
                  setError(null);
                  setMessage(null);
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
