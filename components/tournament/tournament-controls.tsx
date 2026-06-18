"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Play, CheckCircle2, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function TournamentControls({
  tournamentId,
  auctionId,
  tournamentName: initialName,
  tournamentStatus,
}: {
  tournamentId: string;
  auctionId: string;
  tournamentName: string;
  tournamentStatus: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    // eslint-disable-next-line no-alert
    if (!confirm("Delete this tournament and all its data? This cannot be undone.")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/tournament/${tournamentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Failed to delete");
        return;
      }
      toast.success("Tournament deleted");
      router.push(`/auction/${auctionId}`);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setPending(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setPending(true);
    try {
      const res = await fetch(`/api/tournament/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Failed to update");
        return;
      }
      toast.success(`Tournament ${status}`);
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setPending(false);
    }
  };

  const handleRename = async () => {
    if (name === initialName || !name.trim()) {
      setEditing(false);
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/tournament/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Failed to rename");
        return;
      }
      toast.success("Tournament renamed");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Failed to rename");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-sm bg-[#1e2b3b] border-[#3b4b3d] text-[#d6e4f9] w-48"
            autoFocus
          />
          <button onClick={handleRename} disabled={pending} className="text-green-500 hover:text-green-400">
            <Check size={16} />
          </button>
          <button onClick={() => { setEditing(false); setName(initialName); }} className="text-[#849585] hover:text-[#d6e4f9]">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="text-[#849585] hover:text-[#d6e4f9]">
          <Pencil size={14} />
        </button>
      )}

      {tournamentStatus === "draft" && (
        <button
          onClick={() => handleStatusChange("active")}
          disabled={pending}
          className="text-green-500 hover:text-green-400"
          title="Activate tournament"
        >
          <Play size={14} />
        </button>
      )}

      {tournamentStatus === "active" && (
        <button
          onClick={() => handleStatusChange("completed")}
          disabled={pending}
          className="text-blue-500 hover:text-blue-400"
          title="Mark as completed"
        >
          <CheckCircle2 size={14} />
        </button>
      )}

      <button
        onClick={handleDelete}
        disabled={pending}
        className="text-red-400 hover:text-red-300"
        title="Delete tournament"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
