"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function RefreshFplDataButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/fpl/bootstrap?refresh=true");
      if (!res.ok) throw new Error("Refresh failed");
      toast.success("FPL data refreshed");
      router.refresh();
      window.location.reload();
    } catch {
      toast.error("Failed to refresh FPL data");
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={handleRefresh}
      className="border-[#3b4b3d] text-[#b9cbb9] hover:text-[#d6e4f9] hover:bg-[#1e2b3b]"
    >
      <RefreshCw
        className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
      />
      {loading ? "Refreshing..." : "Refresh"}
    </Button>
  );
}
