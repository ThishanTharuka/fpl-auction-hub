"use client";

import { useState, useRef, type FormEvent } from "react";
import { Send } from "lucide-react";

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="border-t border-[#3b4b3d] p-3 flex items-center gap-2"
    >
      <input
        ref={inputRef}
        type="search"
        name="msg983"
        id="msg983"
        inputMode="text"
        enterKeyHint="send"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        spellCheck="false"
        aria-autocomplete="none"
        data-1p-ignore
        data-lpignore="true"
        data-bwignore="true"
        data-form-type="other"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 bg-[#1e2b3b] text-[#d6e4f9] text-sm rounded-lg px-3 py-2 outline-none placeholder:text-[#849585] disabled:opacity-50"
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
