import Skeleton from "./Skeleton";

function PostCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
      {/* Header: avatar + name + time */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="h-2.5 w-20 rounded" />
        </div>
      </div>

      {/* Body: text lines */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-5/6 rounded" />
        <Skeleton className="h-3 w-2/3 rounded" />
      </div>

      {/* Image placeholder */}
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

// Renders `count` post skeletons in a vertical stack
export function PostCardSkeletonList({ count = 3 }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default PostCardSkeleton;
