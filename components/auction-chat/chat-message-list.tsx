"use client";

import { useLayoutEffect, useRef, useState, type MutableRefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, ChevronDown } from "lucide-react";
import type { ChatMessage } from "@/hooks/use-chat";

const MESSAGE_COLORS = [
  "#00e478",
  "#60a5fa",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#34d399",
];

function hashColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MESSAGE_COLORS[Math.abs(hash) % MESSAGE_COLORS.length]!;
}

const SCROLL_THRESHOLD = 60;

export function ChatMessageList({
  messages,
  currentUserId,
  scrollPosRef,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  scrollPosRef: MutableRefObject<number | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(messages.length);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (scrollPosRef.current !== null) {
      container.scrollTop = scrollPosRef.current;
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      prevLenRef.current = messages.length;
      return;
    }

    const prevLen = prevLenRef.current;
    prevLenRef.current = messages.length;

    if (messages.length === 0) return;

    const isNew = messages.length > prevLen;
    if (!isNew) return;

    const last = messages[messages.length - 1]!;
    const isOwn = last.user_id === currentUserId;
    const dist = container.scrollHeight - container.scrollTop - container.clientHeight;

    if (isOwn || dist < SCROLL_THRESHOLD) {
      container.scrollTop = container.scrollHeight;
      setHasNewBelow(false);
    } else {
      setHasNewBelow(true);
    }
  }, [messages, currentUserId]);

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    setHasNewBelow(false);
    setShowScrollButton(false);
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    scrollPosRef.current = container.scrollTop;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < SCROLL_THRESHOLD;
    setShowScrollButton(!nearBottom);
    if (nearBottom) setHasNewBelow(false);
  };

  if (messages.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center text-[#849585] text-sm">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
      >
        {messages.map((msg) => {
          const isMine = msg.user_id === currentUserId;
          const color = hashColor(msg.user_name);
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="text-[12px] font-semibold flex items-center gap-1"
                  style={{ color }}
                >
                  {msg.participant_id === null && (
                    <Crown className="h-3 w-3 text-yellow-400" />
                  )}
                  {msg.user_name}
                </span>
                <span className="text-[10px] text-[#849585]">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div
                className={`rounded-lg px-3 py-1.5 text-sm max-w-[260px] break-words ${
                  isMine
                    ? "bg-[#00e478] text-[#003919] rounded-tr-sm"
                    : "bg-[#1e2b3b] text-[#d6e4f9] rounded-tl-sm"
                }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {hasNewBelow && (
          <motion.button
            key="new-messages-pill"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            onClick={scrollToBottom}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-[#00e478] text-[#003919] text-xs font-semibold rounded-full px-4 py-1.5 shadow-lg hover:bg-[#00b858] transition-colors"
          >
            New messages
          </motion.button>
        )}

        {showScrollButton && (
          <motion.button
            key="scroll-down-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={scrollToBottom}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 rounded-full p-2 bg-[#1e2b3b] text-[#b9cbb9] border border-[#3b4b3d] shadow-lg hover:bg-[#283646] transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
