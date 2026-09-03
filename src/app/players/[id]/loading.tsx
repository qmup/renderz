import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerDetailLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <Skeleton className="h-4 w-20" />
      <div className="flex flex-col gap-6 sm:flex-row">
        <Skeleton className="h-56 w-40 rounded-lg" />
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
