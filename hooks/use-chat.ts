"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface ChatMessage {
  id: number;
  league_id: string;
  user_id: string;
  user_name: string;
  participant_id: string | null;
  message: string;
  created_at: string;
}

export function useChat(
  leagueId: string,
  onIncoming?: (message: ChatMessage) => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    void supabase
      .from("chat_messages")
      .select("*")
      .eq("league_id", leagueId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) {
          setMessages(data.reverse() as ChatMessage[]);
        }
        setLoading(false);
      });
  }, [leagueId, supabase]);

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
          setMessages((prev) => [...prev, message]);
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

  return { messages, loading, sendMessage };
}
