export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3b4b3d] bg-[#0f1c2c] shrink-0 animate-pulse">
        <div className="h-3 w-28 rounded bg-[#1e2b3b]" />
        <div className="h-4 w-4 rounded bg-[#1e2b3b]" />
      </div>
      <div className="flex-1 flex items-center justify-center text-[#849585] text-sm">
        Loading...
      </div>
    </div>
  );
}
