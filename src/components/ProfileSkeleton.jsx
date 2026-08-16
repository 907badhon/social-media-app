import Skeleton from "./Skeleton";

function ProfileSkeleton() {
  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      {/* Header */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <Skeleton className="h-7 w-48 rounded" />
        <Skeleton className="h-3 w-56 rounded" />
      </div>

      {/* Avatar */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <Skeleton className="h-32 w-32 rounded-full" />
        <Skeleton className="h-3 w-32 rounded" />
      </div>

      {/* Form fields */}
      <div className="space-y-5">
        <div>
          <Skeleton className="h-3 w-20 rounded mb-2" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-3 w-14 rounded mb-2" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-3 w-10 rounded mb-2" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default ProfileSkeleton;
