import Link from "next/link";

export default function PlayerNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-16">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Player not in catalog
      </h1>
      <p className="text-muted-foreground text-sm">
        This id has not been discovered yet. On-demand fetches are only allowed
        for players already seeded or ingested.
      </p>
      <Link href="/players" className="text-sm underline-offset-4 hover:underline">
        Back to players
      </Link>
    </main>
  );
}
