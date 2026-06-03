"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "sign_in" | "sign_up";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>("sign_in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setShowResend(false);

    if (mode === "sign_in") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        const normalizedMessage = error.message.toLowerCase();
        if (normalizedMessage.includes("email not confirmed")) {
          setError("Please confirm your email first.");
          setShowResend(true);
        } else {
          setError(error.message);
        }
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
          data: {
            display_name: displayName,
          },
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

  async function handleResendVerification() {
    if (!email) {
      setError("Enter your email first so we can resend the verification link.");
      return;
    }

    setResendLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Verification email resent. Please check your inbox.");
      setShowResend(false);
    }

    setResendLoading(false);
  }

  const idleLabel = mode === "sign_in" ? "Sign in" : "Sign up";
  const busyLabel = mode === "sign_in" ? "Signing in…" : "Signing up…";
  const showLinkExpiredError = urlError === "link_expired";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
        style={{ backgroundImage: "url(/fplbg.jpg)" }}
      />
      <div
        className="relative z-10 w-full max-w-sm rounded-xl border p-8 space-y-6"
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
          {showLinkExpiredError && (
            <p className="text-sm text-amber-300">
              Your confirmation link has expired. Please sign up again.
            </p>
          )}

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

          {mode === "sign_up" && (
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your manager name"
              />
            </div>
          )}

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
            {mode === "sign_in" && (
              <div className="text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs underline hover:opacity-80"
                  style={{ color: "var(--primary)" }}
                >
                  Forgot password?
                </Link>
              </div>
            )}
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

          {showResend && mode === "sign_in" && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendVerification}
              disabled={resendLoading}
            >
              {resendLoading ? "Resending…" : "Resend verification email"}
            </Button>
          )}
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
                  setShowResend(false);
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
                  setShowResend(false);
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
