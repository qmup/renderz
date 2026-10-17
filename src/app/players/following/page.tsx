import { FollowingBrowser } from "@/components/players/following-browser";

export const metadata = {
  title: "Following",
};

export default function FollowingPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:gap-6 sm:py-8">
      <div className="flex flex-col gap-0.5 sm:gap-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-3xl">
          Following
        </h1>
        <p className="text-muted-foreground text-sm">
          Cards you follow in this browser.
        </p>
      </div>
      <FollowingBrowser />
    </main>
  );
}
