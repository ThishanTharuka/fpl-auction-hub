"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { X } from "lucide-react";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { useChatReadBroadcaster } from "@/hooks/use-chat-read-sync";
import { ChatMessageList, type ChatParticipant } from "./chat-message-list";
import { ChatInput } from "./chat-input";

export function ChatWindow({
  leagueId,
  leagueName,
  userId,
  userName,
  participantId,
  participants = [],
  auctioneerId = null,
}: {
  leagueId: string;
  leagueName: string;
  userId: string;
  userName: string;
  participantId: string | null;
  participants?: ChatParticipant[];
  auctioneerId?: string | null;
}) {
  const scrollPosRef = useRef<number | null>(null);
  const latestIdRef = useRef(0);
  const lastSentRef = useRef(0);
  const baseTitleRef = useRef<string | null>(null);
  const [unread, setUnread] = useState(0);
  const broadcast = useChatReadBroadcaster(leagueId);

  const isActive = useCallback(
    () => document.visibilityState === "visible" && document.hasFocus(),
    [],
  );

  const syncRead = useCallback(() => {
    if (!isActive()) return;
    const id = latestIdRef.current;
    if (id > lastSentRef.current) {
      lastSentRef.current = id;
      broadcast(id);
    }
  }, [broadcast, isActive]);

  const handleIncoming = useCallback(
    (message: ChatMessage) => {
      latestIdRef.current = message.id;
      if (isActive()) {
        syncRead();
      } else {
        setUnread((u) => u + 1);
      }
    },
    [isActive, syncRead],
  );

  const { messages, loading, loadingOlder, hasMore, sendMessage, loadOlder } =
    useChat(leagueId, handleIncoming);

  useEffect(() => {
    if (baseTitleRef.current === null) baseTitleRef.current = document.title;
  }, []);

  useEffect(() => {
    const base = baseTitleRef.current;
    if (base === null) return;
    if (!isActive() && unread > 0) {
      document.title = `(${unread}) ${base}`;
    } else {
      document.title = base;
    }
    return () => {
      document.title = base;
    };
  }, [unread, isActive]);

  useEffect(() => {
    const latest = messages.at(-1)?.id;
    if (latest !== undefined) latestIdRef.current = latest;
    syncRead();
  }, [messages, syncRead]);

  useEffect(() => {
    const onActive = () => {
      if (isActive()) {
        setUnread(0);
        syncRead();
      }
    };
    syncRead();
    window.addEventListener("focus", onActive);
    document.addEventListener("visibilitychange", onActive);
    return () => {
      window.removeEventListener("focus", onActive);
      document.removeEventListener("visibilitychange", onActive);
    };
  }, [isActive, syncRead]);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3b4b3d] bg-[#0f1c2c] shrink-0">
        <span className="text-xs font-semibold text-[#849585] uppercase tracking-wider truncate">
          {leagueName}
        </span>
        <button
          onClick={() => window.close()}
          className="text-[#849585] hover:text-[#d6e4f9] transition-colors shrink-0"
          aria-label="Close chat window"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[#849585] text-sm">
          Loading...
        </div>
      ) : (
        <>
          <ChatMessageList
            messages={messages}
            currentUserId={userId}
            scrollPosRef={scrollPosRef}
            hasMore={hasMore}
            loadingOlder={loadingOlder}
            onLoadOlder={loadOlder}
            participants={participants}
            auctioneerId={auctioneerId}
          />
          <ChatInput
            autoFocus
            onSend={(msg) => {
              void sendMessage(msg, userId, userName, participantId).catch(
                () => {},
              );
            }}
            disabled={false}
          />
        </>
      )}
    </div>
  );
}
