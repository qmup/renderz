import { Skeleton } from "@/components/ui/skeleton";

export default function PlayersLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:gap-6 sm:py-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <Skeleton className="h-10 w-full lg:hidden" />
        <div className="hidden w-56 shrink-0 flex-col gap-3 lg:flex">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-24 w-full sm:h-16" />
          <Skeleton className="h-24 w-full sm:h-16" />
          <Skeleton className="h-24 w-full sm:h-16" />
        </div>
      </div>
    </main>
  );
}
