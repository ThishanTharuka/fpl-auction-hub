"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, X, Maximize2 } from "lucide-react";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { useChatReadListener } from "@/hooks/use-chat-read-sync";
import {
  ChatMessageList,
  type ChatParticipant,
} from "./chat-message-list";
import { ChatInput } from "./chat-input";

export function ChatDrawer({
  leagueId,
  userId,
  userName,
  participantId,
  participants = [],
  auctioneerId = null,
}: {
  leagueId: string;
  userId: string;
  userName: string;
  participantId: string | null;
  participants?: ChatParticipant[];
  auctioneerId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const openRef = useRef(false);
  const sentIdsRef = useRef<Set<number>>(new Set());
  const pendingRef = useRef<Array<{ user_id: string; message: string }>>([]);
  const scrollPosRef = useRef<number | null>(null);
  const baseTitleRef = useRef<string | null>(null);
  const latestReadIdRef = useRef(0);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Capture the page's real title once so the unread count can be shown in the
  // tab and restored afterwards.
  useEffect(() => {
    if (baseTitleRef.current === null) baseTitleRef.current = document.title;
  }, []);

  useEffect(() => {
    const base = baseTitleRef.current;
    if (base === null) return;
    if (!open && unread > 0) {
      document.title = `(${unread}) ${base}`;
    } else {
      document.title = base;
    }
    return () => {
      document.title = base;
    };
  }, [open, unread]);

  // Reading messages in a popout window broadcasts "read" so this drawer's
  // unread badge and tab count clear across windows.
  useChatReadListener(leagueId, (messageId) => {
    setUnread(0);
    latestReadIdRef.current = Math.max(latestReadIdRef.current, messageId);
  });

  // Count incoming messages that are new to this view while the drawer is
  // closed. Messages sent from this drawer instance are excluded: realtime
  // echoes carry a message id recorded after insert, and a pending-send match
  // covers the window where the echo arrives before the insert resolves.
  const handleIncoming = useCallback((message: ChatMessage) => {
    const pendingIdx = pendingRef.current.findIndex(
      (m) => m.user_id === message.user_id && m.message === message.message,
    );
    if (pendingIdx !== -1) {
      pendingRef.current.splice(pendingIdx, 1);
      return;
    }
    if (sentIdsRef.current.has(message.id)) return;
    if (message.id <= latestReadIdRef.current) return;
    if (openRef.current) return;
    setUnread((u) => u + 1);
  }, []);

  const { messages, loading, loadingOlder, hasMore, sendMessage, loadOlder } =
    useChat(leagueId, handleIncoming, { enabled: open });

  // Opening the drawer marks everything as read.
  const toggleOpen = () => {
    if (!open) setUnread(0);
    setOpen(!open);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 25,
              mass: 0.8,
            }}
            style={{ transformOrigin: "bottom right" }}
            className="w-80 sm:w-96 h-[75vh] max-h-[calc(100vh-6rem)] rounded-xl border border-[#3b4b3d] bg-[#132030] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#3b4b3d] shrink-0">
              <span className="text-xs font-semibold text-[#849585] uppercase tracking-wider">
                Auction Chat
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-[#849585] hover:text-[#d6e4f9] transition-colors"
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
                    pendingRef.current.push({ user_id: userId, message: msg });
                    void sendMessage(msg, userId, userName, participantId)
                      .then((id) => {
                        const idx = pendingRef.current.findIndex(
                          (m) => m.message === msg,
                        );
                        if (idx !== -1) pendingRef.current.splice(idx, 1);
                        if (id !== null) sentIdsRef.current.add(id);
                      })
                      .catch(() => {
                        const idx = pendingRef.current.findIndex(
                          (m) => m.message === msg,
                        );
                        if (idx !== -1) pendingRef.current.splice(idx, 1);
                      });
                  }}
                  disabled={false}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-3">
        <AnimatePresence>
          {open && (
            <motion.button
              key="popout-btn"
              initial={{ opacity: 0, scale: 0.6, x: 56 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.6, x: 56 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              onClick={() =>
                window.open(`/auction/${leagueId}/chat?popout=1`, "_blank")
              }
              className="rounded-full p-3 bg-[#132030] text-[#b9cbb9] border border-[#3b4b3d] shadow-lg hover:text-[#00e478] hover:bg-[#1e2b3b] transition-colors"
              aria-label="Open chat in a new window"
              title="Open chat in a new window"
            >
              <Maximize2 className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
        <button
          onClick={toggleOpen}
          className="relative rounded-full p-3.5 bg-[#00e478] text-[#003919] shadow-lg hover:bg-[#00b858] transition-colors"
        >
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <MessageSquare className="h-5 w-5" />
          )}
          <AnimatePresence>
            {!open && unread > 0 && (
              <motion.span
                key="unread-badge"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-[#061423]"
              >
                {unread > 99 ? "99+" : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
