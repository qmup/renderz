import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function PlayersLayout({ children }: LayoutProps<"/players">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
