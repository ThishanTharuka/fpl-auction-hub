import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type React from "react";

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
  const words = name.split(" ");
  const initials =
    words.length > 1
      ? words
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : name.slice(0, 2).toUpperCase();

  return (
    <Avatar
      size={size}
      className="shrink-0 after:mix-blend-normal after:[border-width:1px]"
      style={{ "--border": color ?? "#888" } as React.CSSProperties}
    >
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback style={{ fontSize: 10 }}>{initials}</AvatarFallback>
    </Avatar>
  );
}
