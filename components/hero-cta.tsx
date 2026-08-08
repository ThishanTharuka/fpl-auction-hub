"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { buttonVariants } from "@/components/ui/button";

export function HeroCta() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex gap-3" aria-hidden>
        <div className="h-9 w-36 rounded-lg bg-[#132030]" />
        <div className="h-9 w-24 rounded-lg border border-[#3b4b3d]" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex gap-3">
        <Link
          href="/auction"
          className={cn(buttonVariants({ size: "lg" }))}
        >
          Go to Auctions
        </Link>
        <Link
          href="/players"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Players
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Link
        href="/login?mode=sign_up"
        className={cn(buttonVariants({ size: "lg" }))}
      >
        Get Started
      </Link>
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
      >
        Sign In
      </Link>
    </div>
  );
}
