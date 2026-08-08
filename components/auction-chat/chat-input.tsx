"use client";

import { useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

const MAX_HEIGHT = 120;

export function ChatInput({
  onSend,
  disabled,
  autoFocus,
}: {
  onSend: (message: string) => void;
  disabled: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="border-t border-[#3b4b3d] p-3 flex items-end gap-2"
    >
      <textarea
        ref={inputRef}
        rows={1}
        name="msg983"
        id="msg983"
        inputMode="text"
        enterKeyHint="send"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        spellCheck={false}
        aria-autocomplete="none"
        data-1p-ignore
        data-lpignore="true"
        data-bwignore="true"
        data-form-type="other"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 bg-[#1e2b3b] text-[#d6e4f9] text-sm rounded-lg px-3 py-2 outline-none placeholder:text-[#849585] disabled:opacity-50 resize-none overflow-y-auto"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="shrink-0 rounded-lg p-2 text-[#849585] hover:text-[#00e478] disabled:opacity-30 transition-colors"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
