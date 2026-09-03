export default function PlayersPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
      <p className="text-muted-foreground text-sm">
        Catalog listing ships in M3. Search, filters, and pagination will run
        against the local SQLite catalog.
      </p>
    </main>
  );
}
