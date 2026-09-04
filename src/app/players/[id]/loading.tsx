import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerDetailLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-5 sm:gap-8 sm:py-8">
      <Skeleton className="h-4 w-20" />
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
        <Skeleton className="h-52 w-52 rounded-lg sm:h-56 sm:w-40" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </main>
  );
}
