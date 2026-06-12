"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        setError(error.message);
        setLoadingProfile(false);
        return;
      }

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setDisplayName(
        typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : "",
      );

      setLoadingProfile(false);
    }

    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveDisplayName(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }

    setSavingName(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(userError?.message ?? "Could not load user session.");
      setSavingName(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        display_name: displayName.trim(),
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setMessage("Display name updated.");
    }

    setSavingName(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }

    setSavingPassword(false);
  }

  async function handleDeleteAccount() {
    setError(null);
    setMessage(null);
    setDeletingAccount(true);

    const res = await fetch("/api/account/delete", { method: "POST" });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to delete account.");
      setDeletingAccount(false);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // signOut failed but account is already deleted — redirect anyway
    }

    window.location.href = "/login";
  }

  if (loadingProfile) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto w-full max-w-xl">Loading profile...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
            Profile
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Manage your display name and password.
          </p>
        </div>

        <form
          onSubmit={handleSaveDisplayName}
          className="space-y-4 rounded-xl border p-5"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <h2 className="text-lg font-semibold">Display Name</h2>
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              required
              minLength={2}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your manager name"
            />
          </div>

          <Button type="submit" disabled={savingName}>
            {savingName ? "Saving..." : "Save display name"}
          </Button>
        </form>

        <form
          onSubmit={handleChangePassword}
          className="space-y-4 rounded-xl border p-5"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <h2 className="text-lg font-semibold">Change Password</h2>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" disabled={savingPassword}>
            {savingPassword ? "Updating..." : "Update password"}
          </Button>
        </form>

        <div
          className="space-y-4 rounded-xl border p-5"
          style={{ borderColor: "var(--destructive-border, hsl(0 80% 50%))", background: "var(--card)" }}
        >
          <h2 className="text-lg font-semibold text-red-400">Delete Account</h2>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Permanently delete your account and all associated data. This
            action cannot be undone.
          </p>
          {!confirmDelete ? (
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              Delete my account
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                variant="destructive"
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
              >
                {deletingAccount ? "Deleting..." : "Yes, delete my account"}
              </Button>
              <Button
                variant="outline"
                disabled={deletingAccount}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-green-400">{message}</p>}
      </div>
    </main>
  );
}
