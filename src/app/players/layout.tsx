import { FollowedPlayersProvider } from "@/components/players/followed-players";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function PlayersLayout({ children }: LayoutProps<"/players">) {
  return (
    <FollowedPlayersProvider>
      <div className="flex min-h-full flex-1 flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </FollowedPlayersProvider>
  );
}
