export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0 animate-pulse">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-4 w-4 rounded bg-muted" />
      </div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    </div>
  );
}
