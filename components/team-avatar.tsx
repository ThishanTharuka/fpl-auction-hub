import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type React from "react";

/**
 * Team monogram used when a team has no avatar image: first letter of each of
 * the first two words, or the first two characters for single-word names.
 */
export function teamInitials(name: string): string {
  const words = name.split(" ").filter(Boolean);
  return (
    words.length > 1
      ? words
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
      : name.slice(0, 2)
  ).toUpperCase();
}

export function TeamAvatar({
  src,
  name,
  color,
  size = "sm",
}: {
  src?: string | null;
  name: string;
  color?: string | null;
  size?: "sm" | "default" | "lg";
}) {
  return (
    <Avatar
      size={size}
      className="shrink-0 after:mix-blend-normal after:[border-width:1px]"
      style={{ "--border": color ?? "#888" } as React.CSSProperties}
    >
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback style={{ fontSize: 10 }}>{teamInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
