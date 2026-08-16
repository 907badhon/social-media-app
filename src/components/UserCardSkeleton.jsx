import Skeleton from "./Skeleton";

function UserCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white p-4 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-2.5 w-40 rounded" />
        </div>
      </div>
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
  );
}

// Renders `count` user card skeletons in a responsive grid (matches Friends.jsx grid layout)
export function UserCardSkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <UserCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default UserCardSkeleton;
