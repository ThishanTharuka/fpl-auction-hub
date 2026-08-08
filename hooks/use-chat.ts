"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface ChatMessage {
  id: number;
  league_id?: string;
  user_id: string;
  user_name: string;
  participant_id: string | null;
  message: string;
  created_at: string;
}

const MESSAGE_SELECT =
  "id,user_id,user_name,participant_id,message,created_at";

export function useChat(
  leagueId: string,
  onIncoming?: (message: ChatMessage) => void,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const supabase = createSupabaseBrowserClient();
  const enabledRef = useRef(enabled);
  const fetchedRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Fetch recent history once, on the first time the drawer is enabled. The
  // realtime subscription stays live regardless, so the unread badge works
  // while closed without paying for a history query on every page view.
  useEffect(() => {
    if (!enabled || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    void supabase
      .from("chat_messages")
      .select(MESSAGE_SELECT)
      .eq("league_id", leagueId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) {
          setMessages(data.reverse() as ChatMessage[]);
          setHasMore(data.length >= 50);
        }
        setLoading(false);
      });
  }, [enabled, leagueId, supabase]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder) return;
    setLoadingOlder(true);
    try {
      const oldest = messages[0]?.created_at;
      const { data, error } = await supabase
        .from("chat_messages")
        .select(MESSAGE_SELECT)
        .eq("league_id", leagueId)
        .lt("created_at", oldest ?? new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (data && data.length > 0) {
        const older = data.reverse() as ChatMessage[];
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const unique = older.filter((m) => !ids.has(m.id));
          return [...unique, ...prev];
        });
        if (data.length < 50) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } finally {
      setLoadingOlder(false);
    }
  }, [leagueId, supabase, messages, loadingOlder]);

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(`chat:${leagueId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `league_id=eq.${leagueId}`,
        },
        (payload) => {
          const message = payload.new as ChatMessage;
          if (enabledRef.current) {
            setMessages((prev) => [...prev, message]);
          }
          onIncoming?.(message);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [leagueId, supabase, onIncoming]);

  const sendMessage = useCallback(
    async (
      message: string,
      userId: string,
      userName: string,
      participantId: string | null,
    ): Promise<number | null> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          league_id: leagueId,
          user_id: userId,
          user_name: userName,
          participant_id: participantId,
          message,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data?.id ?? null;
    },
    [leagueId, supabase],
  );

  return { messages, loading, loadingOlder, hasMore, sendMessage, loadOlder };
}
