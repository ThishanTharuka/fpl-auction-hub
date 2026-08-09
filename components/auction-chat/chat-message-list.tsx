"use client";

import {
  Fragment,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, ChevronDown } from "lucide-react";
import type { ChatMessage } from "@/hooks/use-chat";
import { TeamAvatar } from "@/components/team-avatar";

export interface ChatParticipant {
  id: string;
  name: string;
  color: string | null;
  avatar_url: string | null;
}

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
const LOAD_OLDER_THRESHOLD = 60;
const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round(
    (startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000,
  );
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function linkify(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  const re = new RegExp(URL_REGEX.source, URL_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const raw = match[0];
    const href = raw.startsWith("www.") ? `https://${raw}` : raw;
    nodes.push(
      <a
        key={`link-${match.index}`}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="underline"
      >
        {raw}
      </a>,
    );
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  if (nodes.length === 0) return text;
  return nodes;
}

type MessageGroup = {
  userId: string;
  userName: string;
  color: string;
  isOwn: boolean;
  participantId: string | null;
  dateLabel: string;
  items: ChatMessage[];
};

function buildGroups(messages: ChatMessage[], currentUserId: string): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const label = dateLabel(msg.created_at);
    const last = groups[groups.length - 1];
    if (last && last.userId === msg.user_id && last.dateLabel === label) {
      last.items.push(msg);
    } else {
      groups.push({
        userId: msg.user_id,
        userName: msg.user_name,
        color: hashColor(msg.user_name),
        isOwn: msg.user_id === currentUserId,
        participantId: msg.participant_id,
        dateLabel: label,
        items: [msg],
      });
    }
  }
  return groups;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatMessageList({
  messages,
  currentUserId,
  scrollPosRef,
  hasMore,
  loadingOlder,
  onLoadOlder,
  participants = [],
  auctioneerId = null,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  scrollPosRef: MutableRefObject<number | null>;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  participants?: ChatParticipant[];
  auctioneerId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(messages.length);
  const prependingRef = useRef(false);
  const prevScrollRef = useRef({ top: 0, height: 0 });
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const participantsById = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (scrollPosRef.current !== null) {
      container.scrollTop = scrollPosRef.current;
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Capture the scroll baseline once a "load older" starts (after the top
  // loading indicator has rendered) so the position can be preserved exactly.
  useLayoutEffect(() => {
    if (loadingOlder && !prependingRef.current) {
      const container = containerRef.current;
      if (!container) return;
      prependingRef.current = true;
      prevScrollRef.current = {
        top: container.scrollTop,
        height: container.scrollHeight,
      };
    } else if (!loadingOlder && prependingRef.current) {
      // Load finished without a message change (failed/empty fetch).
      prependingRef.current = false;
    }
  }, [loadingOlder]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      prevLenRef.current = messages.length;
      return;
    }

    // A prepend grew the list from the top: restore the scroll position by the
    // amount of height added above, and absorb the length change so it is not
    // treated as a new incoming message.
    if (prependingRef.current) {
      prependingRef.current = false;
      container.scrollTop =
        prevScrollRef.current.top +
        (container.scrollHeight - prevScrollRef.current.height);
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
    if (
      container.scrollTop < LOAD_OLDER_THRESHOLD &&
      hasMore &&
      !loadingOlder &&
      !prependingRef.current
    ) {
      onLoadOlder();
    }
  };

  if (messages.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center text-[#849585] text-sm">
        No messages yet. Start the conversation!
      </div>
    );
  }

  const groups = buildGroups(messages, currentUserId);

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {loadingOlder && (
          <div className="text-center text-[11px] text-[#849585] py-1.5">
            Loading earlier messages…
          </div>
        )}
        {groups.map((group, index) => {
          const showDate =
            index === 0 || group.dateLabel !== groups[index - 1]!.dateLabel;
          return (
            <Fragment key={group.items[0]!.id}>
              {showDate && (
                <div className="text-center text-[10px] text-[#5b6b5e] my-1 select-none">
                  {group.dateLabel}
                </div>
              )}
              {group.isOwn ? (
                <div className="flex justify-end">
                  <div className="flex flex-col items-end gap-1 min-w-0">
                    {group.items.map((msg) => (
                      <div
                        key={msg.id}
                        className="flex items-end gap-1.5 px-3 py-1.5 bg-[#0084ff] text-white rounded-3xl rounded-br-sm max-w-[260px]"
                      >
                        <span className="text-sm break-words whitespace-pre-wrap min-w-0">
                          {linkify(msg.message)}
                        </span>
                        <span className="text-[10px] text-white/70 shrink-0">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  {(() => {
                    const participant = group.participantId
                      ? participantsById.get(group.participantId)
                      : undefined;
                    return participant ? (
                      <TeamAvatar
                        name={participant.name}
                        color={participant.color}
                        src={participant.avatar_url}
                        size="sm"
                      />
                    ) : (
                      <div
                        className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-[#061423]"
                        style={{ backgroundColor: group.color }}
                      >
                        {group.userName.charAt(0).toUpperCase()}
                      </div>
                    );
                  })()}
                  <div className="flex flex-col items-start gap-1 min-w-0">
                    <span
                      className="text-[12px] font-semibold flex items-center gap-1"
                      style={{ color: group.color }}
                    >
                      {group.participantId === null &&
                        group.userId === auctioneerId && (
                          <Crown className="h-3 w-3 text-yellow-400" />
                        )}
                      {group.userName}
                    </span>
                    {group.items.map((msg) => (
                      <div
                        key={msg.id}
                        className="flex items-end gap-1.5 px-3 py-1.5 bg-[#1e2b3b] text-[#d6e4f9] rounded-3xl rounded-bl-sm max-w-[260px]"
                      >
                        <span className="text-sm break-words whitespace-pre-wrap min-w-0">
                          {linkify(msg.message)}
                        </span>
                        <span className="text-[10px] text-[#849585] shrink-0">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Fragment>
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
