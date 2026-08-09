"use client";

import { useEffect, useCallback, useRef } from "react";

const READ_EVENT = "chat-read";

interface ReadEvent {
  type: "chat-read";
  messageId: number;
}

function channelName(leagueId: string) {
  return `fpl-chat-read:${leagueId}`;
}

export function useChatReadBroadcaster(leagueId: string) {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel(channelName(leagueId));
    channelRef.current = channel;
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [leagueId]);

  return useCallback(
    (messageId: number) => {
      const event: ReadEvent = { type: READ_EVENT, messageId };
      channelRef.current?.postMessage(event);
    },
    [],
  );
}

export function useChatReadListener(
  leagueId: string,
  onRead: (messageId: number) => void,
) {
  const onReadRef = useRef(onRead);

  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);

  useEffect(() => {
    const channel = new BroadcastChannel(channelName(leagueId));
    const handler = (event: MessageEvent) => {
      const data = event.data as ReadEvent | undefined;
      if (data && data.type === READ_EVENT) {
        onReadRef.current(data.messageId);
      }
    };
    channel.addEventListener("message", handler);
    return () => {
      channel.removeEventListener("message", handler);
      channel.close();
    };
  }, [leagueId]);
}
