"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, X } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { ChatMessageList } from "./chat-message-list";
import { ChatInput } from "./chat-input";

export function ChatDrawer({
  leagueId,
  userId,
  userName,
  participantId,
}: {
  leagueId: string;
  userId: string;
  userName: string;
  participantId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const scrollPosRef = useRef<number | null>(null);
  const { messages, loading, sendMessage } = useChat(leagueId);

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
              />
                <ChatInput
                  onSend={(msg) => {
                    void sendMessage(msg, userId, userName, participantId);
                  }}
                  disabled={false}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full p-3.5 bg-[#00e478] text-[#003919] shadow-lg hover:bg-[#00b858] transition-colors"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageSquare className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
