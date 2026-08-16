import Skeleton from "./Skeleton";

function ChatListItemSkeleton() {
  return (
    <div className="w-full flex items-center gap-3 rounded-xl p-3">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-2.5 w-32 rounded" />
      </div>
    </div>
  );
}

// Renders `count` chat list item skeletons, stacked (matches Chat.jsx sidebar)
export function ChatListSkeleton({ count = 6 }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <ChatListItemSkeleton key={i} />
      ))}
    </div>
  );
}

export default ChatListItemSkeleton;
